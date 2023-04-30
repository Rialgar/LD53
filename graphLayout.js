const defaultConfig = {
    springScale: 100,
    chargeK: 100000000,
    damping: 100,
    maxAcceleration: 5000,
    edgeRepulsionScale: 10
};

function closestOnLine(a, b, p){
    const slope = {x: b.x-a.x, y: b.y-a.y};
    if(slope.x === 0 && slope.y === 0){
        return a;
    }

    const perp = {x: slope.y, y: -slope.x};
    // solve a + r*slope === b + t*perp

    // a.x + r*slope.x === p.x + t*perp.x
    // a.y + r*slope.y === p.y + t*perp.y

    let r = 0;
    if(perp.x === 0){
        r = (p.x-a.x) / slope.x;
    } else {
        // t = (a.x + r*slope.x - p.x)/perp.x
        // a.y + r*slope.y = p.y + (a.x + r*slope.x - p.x)*perp.y/perp.x
        // r*slope.y - r*slope.x*perp.y/perp.x = p.y - a.y + (a.x - p.x)*perp.y/perp.x
        // r(slope.y - slope.x*perp.y/perp.x) = p.y - a.y + (a.x - p.x)*perp.y/perp.x
        r = (p.y - a.y + (a.x - p.x)*perp.y/perp.x) / (slope.y - slope.x*perp.y/perp.x)
    }

    if(r <= 0){
        return a;
    } else if(r >= 1){
        return b;
    } else {
        return {
            x: a.x + r * slope.x,
            y: a.y + r * slope.y
        }
    }
}
window.closestOnLine = closestOnLine;


export function createNode(x, y, mass = 1, charge = 1){
    return {
        position: {x, y},
        velocity: {x:0, y:0},
        mass,
        charge,
        connections: []
    }
}

export function connect(a, b, strength = 1){
    if(a !== b && a.connections.some(con => con.other === b)){
        return;
    }

    const data = {
        a, b, strength
    }

    a.connections.push({
        other: b,
        data
    });
    b.connections.push({
        other: a,
        data
    })
}

export function disconnect(a, b){
    a.connections.filter(con => con.other !== b);
    b.connections.filter(con => con.other !== a)
}

export function layout(nodes, dt, globalConfig = {}){
    let cfg = {...defaultConfig, ...globalConfig};
    nodes.forEach(node => {
        node.force = {x:-node.position.x, y:-node.position.y};
    });
    nodes.forEach(node => {
        if(node.isDragged){
            return;
        }
        node.connections.forEach(({other, data: {strength}}) => {
            const k = cfg.springScale * strength * dt
            // F = d * k
            node.force.x += (other.position.x - node.position.x) * k;
            node.force.y += (other.position.y - node.position.y) * k;
        });
        const repulse = (x, y, charge, power, others = []) => {
            const dx = node.position.x - x;
            const dy = node.position.y - y;
            const distSq = dx * dx + dy * dy;

            if(distSq !== 0){
                // F = (k * q1 * q2) / (d * d)
                const force = cfg.chargeK * node.charge * charge / Math.pow(distSq, power/2) * dt;

                const dist = Math.sqrt(distSq);
                const forceX = dx/dist * force;
                const forceY = dy/dist * force;
                node.force.x += forceX;                
                node.force.y += forceY;
                others.forEach(other => {
                    other.force.x -= forceX/others.length;
                    other.force.y -= forceY/others.length;
                })
            }
        }
        nodes.forEach(other => {
            if(other === node){
                return;
            }            

            repulse(other.position.x, other.position.y, other.charge, 2);
            if(!other.isDragged){
                other.connections.forEach(con => {
                    if(con.other === node || con.other.isDragged){
                        return;
                    }
                    const closest = closestOnLine(other.position, con.other.position, node.position)
                    repulse(closest.x, closest.y, cfg.edgeRepulsionScale, 4, [other, con.other]);
                })
            }
        });
        node.velocity.x /= Math.pow(cfg.damping, dt);
        node.velocity.y /= Math.pow(cfg.damping, dt);
    });

    nodes.forEach(node => {
        let aX = node.force.x * node.mass;
        let aY = node.force.y * node.mass;

        const a = Math.sqrt(aX*aX + aY* aY);
        if(a > cfg.maxAcceleration){
            aX *= cfg.maxAcceleration/a;
            aY *= cfg.maxAcceleration/a;
        }

        const dVx = aX * dt;
        const dVy = aY * dt;
        node.velocity.x += dVx;
        node.velocity.y += dVy;        
        node.position.x += (node.velocity.x + dVx/2) * dt;
        node.position.y += (node.velocity.y + dVy/2) * dt;
    })

}