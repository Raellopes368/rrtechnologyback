const { GraphQLServer, PubSub } = require("graphql-yoga");
const mongoose = require("mongoose");
const { resolve } = require("path");
const resolvers = require("./Resolvers/Resolvers");
const pubsub = new PubSub();
mongoose.connect("mongodb+srv://rael:rael@cluster0-8qmbp.mongodb.net/chatapp?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useCreateIndex: true
});

const server = new GraphQLServer({
  typeDefs: resolve(__dirname, "schema.graphql"),
  resolvers,
  context: { pubsub }
});
process.on("warning", e => console.warn(e.stack));
server.start(
  {
    port: process.env.PORT || 4001
  },
  () => {
    console.log("Servidor Ativo!");
  }
);
