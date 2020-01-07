const server = require("../dist/server");

server.runMemoryServer({
  initialData: {
    things: {
      thing1: { rows: ["row1"] }
    }
  },
  port: 8091
});
