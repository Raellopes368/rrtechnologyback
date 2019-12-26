const { Schema, model } = require("mongoose");
const User = require("./User");

const SchemaConversa = new Schema({
  create: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: User
  },
  participante2: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: User
  },
  mensagens: [
    {
      type: String
    }
  ],
  respostas: [
    {
      type: String
    }
  ],
  transmissor: [
    {
      type: Schema.Types.ObjectId,
      ref: User
    }
  ],
  receptor: [
    {
      type: Schema.Types.ObjectId,
      ref: User
    }
  ],
  hour: [
    {
      type: String
    }
  ],

  deleteAlls: [
    {
      ok: {
        type: Boolean
      }
    }
  ],
  deleteFor: [
    {
      id1: {
        type: String
      },
      id2: {
        type: String
      }
    }
  ]
});

module.exports = model("Conversa", SchemaConversa);
