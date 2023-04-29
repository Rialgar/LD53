import * as layout from './graphLayout.js';

const nodes = [];

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

    for(let i = 0; i < 20; i++){
        nodes.push(layout.createNode(Math.random()-0.5, Math.random()-0.5));
        do {
            const b = Math.floor(Math.random() * nodes.length);
            layout.connect(nodes[nodes.length-1], nodes[b])
        } while(Math.random() > 0.8)
    }

    let lastTime = 0;
    function frame(time){
        const dt = Math.min(time-lastTime, 100)/1000;
        lastTime = time;

        layout.layout(nodes, dt);

        //force flush buffer
        canvas.width = 0;
        canvas.height = 0;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'white';
        ctx.fillText(Math.round(1/dt), 10, 20);

        const offsetX = width/2;
        const offsetY = height/2;
        ctx.save();
        ctx.translate(offsetX, offsetY);

        nodes.forEach(node => {
            node.connections.forEach(con => {
                if(!con.drawn || con.drawn < time){
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(node.position.x, node.position.y);
                    ctx.lineTo(con.other.position.x, con.other.position.y);
                    ctx.stroke();
                    con.drawn = time;
                }
            })
        });

        nodes.forEach(node => {
            ctx.fillStyle = '#111';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse( node.position.x, node.position.y, 10, 10, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        });

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