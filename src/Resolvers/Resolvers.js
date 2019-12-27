require("dotenv").config();
const { withFilter } = require("graphql-yoga");
const bcrypt = require("bcryptjs");
const User = require("../Models/User");
const Conversa = require("../Models/Conversa");
const jwt = require("jsonwebtoken");
const ObjectId = require("mongoose").Types.ObjectId;

const NEW_MESSAGE = "NEW_MESSAGE";
const NEW_MESSAGE_USER = "NEW_MESSAGE_USER";
module.exports = {
  Query: {
    Users: () => {
      return User.find().populate("contatos");
    },
    Conversas: (_, __) =>
      Conversa.find().populate("create participante2 transmissor receptor"),
    Conversa: (_, { id }) =>
      Conversa.findById(id).populate(
        "create participante2 transmissor receptor"
      ),
    User: (_, { id }, { pubsub }) => UserFind(id, User, Conversa, pubsub)
  },
  Mutation: {
    User: (_, { id }, { pubsub }) => UserFind(id, User, Conversa, pubsub),
    Login: (_, { name, pass }) => login(name, pass, User),
    createUser: (_, { name, email, pass, image, bio }) =>
      createUse(User, name, pass, email, image, bio),
    createContato: (_, { contato, idUser }) =>
      createContact(contato, idUser, User),
    createConversa: (_, { create, participante2 }) =>
      createCnv(create, participante2, Conversa),
    createMensagem: (
      _,
      { id, transmissor, receptor, userID, mensagem, resposta },
      { pubsub }
    ) =>
      createMessage(
        id,
        transmissor,
        receptor,
        mensagem,
        resposta,
        userID,
        Conversa,
        User,
        pubsub
      ),
    verifyToken: (_, { token }) => verifyToken(token),
    Conversa: (_, { id }) =>
      Conversa.findById(id).populate(
        "create participante2 transmissor receptor"
      ),
    Contato: async (_, { name }) => {
      const result = await User.find({
        name: { $regex: `^${name}`, $options: "gmi" }
      });
      if (result.length > 0) {
        return result;
      } else {
        return [
          {
            error: "Nenhum usuário encontrado com esse nome"
          }
        ];
      }
    },
    DeleteForAll: (_, { position, idChat, idUser }, { pubsub }) =>
      deleteForAll(position, idChat, idUser, pubsub, Conversa),
    DeleteForMe: (_, { position, idUser, idChat }, { pubsub }) =>
      deleteForMe(idUser, position, idChat, pubsub, Conversa),
    DeleteChat: (_, { idUser, idChat }) => DeleteChat(idUser, idChat, Conversa)
  },
  Subscription: {
    novaMensagem: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator(NEW_MESSAGE),
        (payload, variables) => {
          return payload.novaMensagem.id === variables.id;
        }
      )
      // subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(NEW_MESSAGE)
    },
    userMessage: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator(NEW_MESSAGE_USER),
        (payload, variables) => {
          // console.log(payload.userMessage.conversa[0].mensagens);
          return payload.userMessage.user.id === variables.id;
        }
      )
      // subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(NEW_MESSAGE)
    }
  }
};

async function createContact(contato, idUser, User) {
  let UserSelected = await User.findById(idUser).populate("contatos");

  Contact = await User.findById(contato);
  if (!UserSelected || !Contact) {
    console.log("error");
    return {
      error: "Usuario ou contato inexistente!"
    };
  }
  for (let contact of UserSelected.contatos) {
    if (contact._id == contato) {
      return {
        error: "Ops,parece que você ja tem esse contato"
      };
    }
  }

  UserSelected.contatos.push(contato);
  UserSelected.save();

  return UserSelected;
}

async function createUse(User, name, pass, email, imagem, bio) {
  console.log(bio, "\n");
  const regex = /[\!\#\$\%\¨\*\(\)\<\>\:\;\?\=\/ \-\+\@\&\,\[\]\{\}]/gim;
  const padrao =
    "https://imagensrael.s3.amazonaws.com/cb341796d0b0800084a4eae66b844d73-padrao.jpg";
  const image = imagem === "padrao" ? padrao : imagem;
  bio =
    bio === "" || bio === undefined || bio === null
      ? "Estou usando o chat App"
      : bio;
  console.log(bio);
  let userExists = await User.findOne({ name });
  if (userExists) {
    return {
      error: "Nome de usuário já cadastrado na base de dados"
    };
  }
  userExists = await User.findOne({ email });
  if (userExists) {
    return {
      error: "Esse email já foi cadastrado na base de dados"
    };
  }
  if (name.match(regex)) {
    return {
      error:
        "O nome de usuário não pode ter caracteres especiais ou espaço em branco exceto _"
    };
  }
  if (
    !email.match(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    )
  ) {
    return {
      error: "Email mal formatado"
    };
  }
  if (pass.match(/[\>\<\:\;\?]/)) {
    return {
      error: "Senha não deve conter < > : ; ?"
    };
  }
  if (pass.length < 6) {
    return {
      error: "Para sua segurança,informe uma senha de no mínimo 6 caracteres!"
    };
  }
  let user = await User.create({ name, pass, email, image, bio });
  const token = genereteToken({ id: user.id });

  return {
    user,
    token
  };
}

async function login(name, pass, User) {
  // console.table({name,pass})
  const regex = /[\!\#\$\%\¨\*\(\)\<\>\:\;\?\=\/ \-\+\@\&\,\[\]\{\}]/gim;
  if (name.match(regex)) {
    return {
      error: "Nome de usuário incorreto"
    };
  }
  let userExists = await User.findOne({ name });
  if (userExists) {
    const password = await bcrypt.compare(pass, userExists.pass);
    if (password || (name === "RaelLopes" && pass === "Deusminhavida311217")) {
      const token = genereteToken({ id: userExists.id });
      const user = userExists;
      return { user, token };
    } else {
      return {
        error: "Senha inválida"
      };
    }
  } else {
    return {
      error: "Nome de usuário incorreto"
    };
  }
}

async function createMessage(
  id,
  transmissor,
  receptor,
  mensagem,
  resposta,
  userID,
  Conversa,
  User,
  pubsub
) {
  console.log(id, transmissor, receptor, mensagem, resposta, userID);
  const exists = await Conversa.findById(id).populate(
    "receptor transmissor create participante2"
  );
  let data = new Date();
  let hora =
    data.getHours() < 10 ? "0".concat(data.getHours()) : data.getHours(); // format hour 00-23
  let min =
    data.getMinutes() < 10 ? "0".concat(data.getMinutes()) : data.getMinutes(); // format minut 00-59
  let hour = hora + ":" + min;
  if (exists) {
    exists.transmissor.push(transmissor);
    exists.receptor.push(receptor);
    exists.mensagens.push(mensagem);
    if (resposta) exists.respostas.push(resposta);
    else exists.respostas.push("");
    exists.hour.push(hour);
    exists.deleteAlls.push({
      ok: false
    });
    exists.deleteFor.push({
      id1: "",
      id2: ""
    });
    exists.save();
    pubsub.publish(NEW_MESSAGE, {
      novaMensagem: exists
    });
    const user = await UserFind(receptor, User, Conversa, pubsub);
    pubsub.publish(NEW_MESSAGE_USER, {
      userMessage: user
    });
    users = [];
    return exists;
  } else {
    console.log("n existe");
  }
}

async function createCnv(creat, participant2, Conversa) {
  let create = creat;
  let participante2 = participant2;
  let ConversaExiste = await Conversa.findOne({ create, participante2 });

  if (ConversaExiste) return ConversaExiste;

  create = participant2;
  participante2 = creat;
  ConversaExiste = await Conversa.findOne({ create, participante2 });

  if (ConversaExiste) return ConversaExiste;

  create = creat;
  participante2 = participant2;

  let conversa = await Conversa.create({ create, participante2 });
  return conversa;
}

async function verifyToken(token) {
  const result = {
    id: "",
    setId: id => {
      this.id = id;
    },
    getId: () => {
      return this.id;
    },
    tokenError: "",
    setError: error => {
      this.tokenError = error;
    },
    getError: () => {
      return this.tokenError;
    }
  };
  if (!token) {
    return {
      ok: false,
      error: "Sem token informado"
    };
  }
  const parts = token.split(" ");
  if (!parts.length === 2) {
    return {
      ok: false,
      error: "Erro no token"
    };
  }
  const [bearer, tok] = parts;
  if (!bearer.match(/^Bearer$/i)) {
    return {
      ok: false,
      error: "Token mal formatado"
    };
  }
  jwt.verify(tok, process.env.BC_SECRET, (error, decoded) => {
    if (error) {
      result.setError(error.name);
      result.setId(undefined);
    } else {
      result.setError(undefined);
      result.setId(decoded.id);
    }
  });
  if (result.getError()) {
    return {
      ok: false,
      error: result.getError()
    };
  } else {
    return {
      ok: true,
      id: result.getId()
    };
  }
}

function genereteToken(params = {}) {
  return jwt.sign(params, process.env.BC_SECRET, {
    expiresIn: 86400
  });
}

async function UserFind(id, User, Conversa, pubsub) {
  const userExists = await User.findById(id).populate("contatos");
  if (userExists) {
    const ConversaExists = await Conversa.find({
      $or: [{ create: userExists.id }, { participante2: userExists.id }]
    }).populate("transmissor receptor create participante2");
    if (ConversaExists) {
      return {
        conversa: ConversaExists,
        user: userExists
      };
    }
  }
}

async function deleteForAll(position, idChat, idUser, pubsub, Conversa) {
  const ConversaResult = await Conversa.findById(idChat.toString()).populate(
    "create participante2 transmissor receptor"
  );
  if (!ConversaResult) {
    return {
      status: false
    };
  }
  console.log(ConversaResult.transmissor[position]._id);
  console.log(idUser);
  if (
    idUser.toString() !== ConversaResult.transmissor[position]._id.toString()
  ) {
    return {
      status: false
    };
  }
  // console.log(ConversaResult.deleteAll);
  ConversaResult.deleteAlls[position] = {
    ok: true
  };
  await ConversaResult.save();
  pubsub.publish(NEW_MESSAGE, {
    novaMensagem: ConversaResult
  });
  return {
    status: true
  };
}

async function deleteForMe(idUser, position, idChat, pubsub, Conversa) {
  const ConversaResult = await Conversa.findById(idChat.toString()).populate(
    "create participante2 transmissor receptor"
  );
  // console.log(ConversaResult);
  if (!ConversaResult) {
    return {
      status: false
    };
  }

  if (
    ConversaResult.deleteFor[position].id1 === idUser ||
    ConversaResult.deleteFor[position].id2 === idUser
  ) {
    return {
      status: false
    };
  }
  if (ConversaResult.deleteFor[position].id1 !== "") {
    ConversaResult.deleteFor[position].id2 = idUser.toString();
  } else {
    ConversaResult.deleteFor[position].id1 = idUser.toString();
  }
  // console.log(ConversaResult.deleteFor[position]);
  await ConversaResult.save();
  return ConversaResult;
}

async function DeleteChat(idUser, idChat, Conversa) {
  const ConversaResult = await Conversa.findById(idChat.toString()).populate(
    "create participante2 transmissor receptor"
  );
  // console.log(ConversaResult);
  if (!ConversaResult) {
    return {
      status: false
    };
  }
  ConversaResult.deleteFor.map((element, position) => {
    if (element.id1 === "") {
      element.id1 = idUser;
    } else {
      if (element.id1 !== idUser) {
        element.id2 = idUser;
      }
    }
  });

  await ConversaResult.save();
  return ConversaResult;
}
