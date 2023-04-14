const express = require('express');
const app = express();
const { WebSocketServer } = require('ws');
const CA = require('node-epics-ca');

// Example URL: http://localhost:3000?pv=calcExample1
app.get('/', async (req, res) => {
    let pv = req.query.pv;
    if(!pv) {
        return res.status(401).json({ message: 'PV is not specified.' });
    }
    
    try {
        let value = await CA.get(pv);
        res.json({ pv: pv, value: value });
    } catch (error) {
        res.status(500).json({ message: `Get failed due to ${error}` });
    }
});

// Example URL: http://localhost:3000?pv=calcExample1&value=5
app.put('/', async (req, res) => {
    let pv = req.query.pv;
    if(!pv) {
        return res.status(401).json({ message: 'PV is not specified.' });
    }
    let value = req.query.value;
    if(!value) {
        return res.status(401).json({ message: 'Value is not specified.' });
    }
    
    try {
        await CA.put(pv, Number(value));  // Assume value is a number instead of string 
        res.json({ message: 'Success' });
    } catch (error) {
        res.status(500).json({ message: `Put failed due to ${error}` });
    }
});

// Example URL:　ws://localhost:3001
const wss = new WebSocketServer({ port: 3001 });
let sockets = [];
function monitor(pvName) {
    CA.monitor(pvName, function(data) {
        for(let socket of sockets) {
            socket.send(JSON.stringify({
                pv: pvName,
                value: data
            }));
        }
    });
}
monitor('calcExample1');
monitor('calcExample2');
wss.on("connection", (socket) => {
    sockets.push(socket);
    socket.on('close', function() {
        sockets = sockets.filter(s => s !== socket);
    });
});

app.listen(3000);