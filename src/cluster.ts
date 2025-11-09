import cluster from 'cluster';
import os from 'os';
import http from 'http';
import { server } from './server';


const PORT = parseInt(process.env.PORT || '4000', 10);
const numCPUs = os.availableParallelism();
const workerPorts = Array.from({ length: numCPUs - 1 }, (_, i) => PORT + i + 1);

if (cluster.isPrimary) {
  console.log(`Master process running on port ${PORT}`);
  let current = 0;

  workerPorts.forEach((port) => {
    cluster.fork({ WORKER_PORT: port.toString() });
  });

  const balancer = http.createServer((req, res) => {
    const targetPort = workerPorts[current];
    current = (current + 1) % workerPorts.length;
    console.log(`Forwarding request ${req.method} ${req.url} → worker on port ${targetPort}`);

    const proxy = http.request(
      {
        hostname: 'localhost',
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (workerRes) => {
        res.writeHead(workerRes.statusCode || 500, workerRes.headers);
        workerRes.pipe(res);
      }
    );

    req.pipe(proxy);
    proxy.on('error', (err) => {
      res.writeHead(500);
      res.end('Load balancer error');
    });
  });

  balancer.listen(PORT, () => {
    console.log(`Load balancer listening on port ${PORT}`);
  });
} else {
  const workerPort = parseInt(process.env.WORKER_PORT || '0', 10);
  server.listen(workerPort, () => {
    console.log(`Worker ${process.pid} listening on port ${workerPort}`);
  });
}
