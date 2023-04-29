const defaultConfig = {
    springScale: 100,
    chargeK: 100000000,
    damping: 100,
    maxAcceleration: 5000
};

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
        node.connections.forEach(({other, data: {strength}}) => {
            const k = cfg.springScale * strength * dt
            // F = d * k
            node.force.x += (other.position.x - node.position.x) * k;
            node.force.y += (other.position.y - node.position.y) * k;
        });
        nodes.forEach(other => {
            if(other === node){
                return;
            }
            const dx = node.position.x - other.position.x;
            const dy = node.position.y - other.position.y;
            const distSq = dx * dx + dy * dy;

            if(distSq !== 0){
                // F = (k * q1 * q2) / (d * d)
                const force = cfg.chargeK * node.charge * other.charge / distSq * dt;

                const dist = Math.sqrt(distSq);
                node.force.x += dx/dist * force;
                node.force.y += dy/dist * force;
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