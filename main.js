import * as layout from './graphLayout.js';

const nodes = [];
const connections = [];

function rebuildConnectionArray(){
    connections.length = 0;
    nodes.forEach(node => node.connections.forEach(con => {
        if(!connections.includes(con.data)){
            connections.push(con.data);
        }
    }))
}

function haveCrossing(a1, a2, b1, b2){    
    const slopeA = {x: a2.x-a1.x, y: a2.y-a1.y};
    if(slopeA.x === 0 && slopeA.y === 0){
        return false;
    }

    const slopeB = {x: b2.x-b1.x, y: b2.y-b1.y};
    if(slopeB.x === 0 && slopeB.y === 0){
        return false;
    }    
    // solve a1 + r*slopeA = b1 + t*slopeB

    // a1.x + r*slopeA.x = b1.x + t*slopeB.x
    // a1.y + r*slopeA.y = b1.y + t*slopeB.y

    if(slopeB.x === 0){
        if(slopeA.x === 0){
            return (Math.min(a1.y, a2.y) - Math.min(b1.y, b2.y)) * (Math.max(a1.y, a2.y) - Math.max(b1.y, b2.y)) < 0;
        } else {
            // a1.x + r*slopeA.x = b1.x
            const r = (b1.x-a1.x) / slopeA.x;
            return 0 <= r && r <= 1;
        }
    } else if(slopeA.y/slopeA.x === slopeB.y/slopeB.x){
        //parallel lines
        return (Math.min(a1.x, a2.x) - Math.min(b1.x, b2.x)) * (Math.max(a1.x, a2.x) - Math.max(b1.x, b2.x)) < 0;
    } else {
        // t = (a1.x + r*slopeA.x - b1.x)/slopeB.x
        // a1.y + r*slopeA.y = b1.y + (a1.x + r*slopeA.x - b1.x)*slopeB.y/slopeB.x
        // r*slopeA.y - r*slopeA.x*slopeB.y/slopeB.x = p.y - a1.y + (a1.x - b1.x)*slopeB.y/slopeB.x
        // r*(slopeA.y - slopeA.x*slopeB.y/slopeB.x) = p.y - a1.y + (a1.x - b1.x)*slopeB.y/slopeB.x
        const r = (b1.y - a1.y + (a1.x - b1.x)*slopeB.y/slopeB.x) / (slopeA.y - slopeA.x*slopeB.y/slopeB.x);
        const t = (a1.x + r*slopeA.x - b1.x)/slopeB.x;        
        return 0 < r && r < 1 && 0 < t && t < 1;
    }
}

function checkForCrossings(){
    connections.forEach(con => {
        con.hasCrossing = false;
    })
    for (let i = 0; i < connections.length; i++) {
        const conA = connections[i];
        for (let j = i+1; j < connections.length; j++) {
            const conB = connections[j];
            if(conA.a !== conB.a && conA.a !== conB.b && conA.b !== conB.a && conA.b !== conB.b){
                const crossing = haveCrossing(conA.a.position, conA.b.position, conB.a.position, conB.b.position);
                conA.hasCrossing |= crossing;
                conB.hasCrossing |= crossing;
            }
        }        
    }
}

window.saveNetwork = () => {
    if(!localStorage.networks){
        localStorage.networks = '[]';
    }
    const networks = JSON.parse(localStorage.networks);
    const network = [];
    nodes.forEach(node => network.push(node.connections.map(con => nodes.indexOf(con.other))))
    networks.push(network);
    localStorage.networks = JSON.stringify(networks);
}

window.loadNetwork = index => {
    const network = JSON.parse(localStorage.networks)[index];
    nodes.length = 0;
    network.forEach(connections => {
        const node = layout.createNode((Math.random()-0.5)*100, (Math.random()-0.5)*100);
        nodes.push(node);
        connections.forEach(index => {
            if(index < nodes.length){
                layout.connect(node, nodes[index]);
            }
        });
    });
    rebuildConnectionArray();
    for(let i = 0; i < 1000; i++){
        layout.layout(nodes, 1/60, {edgeRepulsionScale: 0});
    }    
}

function draw(ctx, time){
    nodes.forEach(node => {
        node.connections.forEach(con => {
            if(!con.drawn || con.drawn < time){
                ctx.beginPath();
                ctx.moveTo(node.position.x, node.position.y);
                ctx.lineTo(con.other.position.x, con.other.position.y);

                ctx.strokeStyle = 'white';
                ctx.lineWidth = 8;
                ctx.stroke();

                ctx.strokeStyle = con.data.hasCrossing ? 'red' : '#111';
                ctx.lineWidth = 3;
                ctx.stroke();
                con.drawn = time;
            }
        })
    });

    nodes.forEach(node => {
        ctx.fillStyle = node.isDragged ? '#FD9' : node.isTarget ? '#A60' : '#111';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(node.position.x, node.position.y, 15, 15, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    });

    ctx.restore();
}

function init(){

    const canvas = document.getElementById('game');
    let width = 800;
    let height = 600;
    function resize(){
        width = document.documentElement.clientWidth;
        height = document.documentElement.clientHeight;
        canvas.width = width;
        canvas.height = height;
    }
    resize();
    window.addEventListener('resize', resize);

    for(let i = 0; i < 50; i++){
        nodes.push(layout.createNode((Math.random()-0.5)*100, (Math.random()-0.5)*100));
        do {
            const b = Math.floor(Math.random() * (nodes.length - 1));
            layout.connect(nodes[nodes.length-1], nodes[b])
        } while(Math.random() > 0.80)
    }
    rebuildConnectionArray();
    for(let i = 0; i < 1000; i++){
        layout.layout(nodes, 1/60, {edgeRepulsionScale: 0});
    }


    let scale = 1;
    let translation = {x: 0, y: 0};
    let target = null;
    let dragged = null;
    window.addEventListener('mousemove', ev => {
        if(ev.buttons === 2){
            translation.x += ev.movementX;
            translation.y += ev.movementY;
        }
        const x = (ev.clientX - width/2 - translation.x) / scale;
        const y = (ev.clientY - height/2 - translation.y) / scale;

        if(dragged){
            dragged.position = {x, y};
        } else {
            if(target){
                target.isTarget = false;
            }
            target = nodes.find(node => {
                const dx = x - node.position.x;
                const dy = y - node.position.y;
                return dx*dx + dy*dy < 225;
            })
            if(target){
                target.isTarget = true;
            }
        }
    });

    window.addEventListener('contextmenu', e => e.preventDefault());    

    window.addEventListener('mousedown', ev => {
        if(ev.button === 0){
            ev.preventDefault();
            ev.stopPropagation();
            if(!dragged && target){
                dragged = target;
                dragged.isDragged = true;                
            }
        }
    })

    window.addEventListener('mouseup', ev => {
        if(ev.button === 0){
            ev.preventDefault();
            ev.stopPropagation();
            if(dragged){
                dragged.isDragged = false;
                dragged = null;
            }
        }
    })
    
    window.addEventListener('wheel', ev => {
        if(ev.deltaY > 0){
            scale /= 1.1;
        } else if(ev.deltaY < 0){
            scale *= 1.1;
        }
    })

    let lastTime = 0;
    let flushCounter = 0;
    function frame(time){
        const dt = Math.min(time-lastTime, 100)/1000;
        lastTime = time;

        let draggedPos;
        if(dragged){
            draggedPos = {...dragged.position};
        }
        layout.layout(nodes, dt);
        if(dragged){
            dragged.position = draggedPos;
        }

        checkForCrossings();

        if(flushCounter > 100){
            //force flush buffer
            canvas.width = 0;
            canvas.height = 0;
            canvas.width = width;
            canvas.height = height;
            flushCounter = 0
        }
        flushCounter += 1;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.fillText(Math.round(1/dt), 10, 20);

        ctx.save();
        ctx.translate(width/2 + translation.x, height/2 + translation.y);
        ctx.scale(scale, scale);

        draw(ctx, time);

        ctx.restore();
        window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
}

if (!document.readyState === "complete"){
    init();
} else {
    document.addEventListener("load", init());
}