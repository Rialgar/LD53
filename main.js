import * as layout from './graphLayout.js';

const nodes = [];

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

                ctx.strokeStyle = '#111';
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
            const b = Math.floor(Math.random() * nodes.length);
            layout.connect(nodes[nodes.length-1], nodes[b])
        } while(Math.random() > 0.80)
    }
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