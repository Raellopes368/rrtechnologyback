const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true
    },
    email: {
      type: String,
      unique: true,
      required: true
    },
    pass: {
      type: String,
      required: true
    },
    contatos: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    image: {
      type: String
    },
    bio: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

UserSchema.pre("save", async function(next) {
  const hash = await bcrypt.hash(this.pass, 8);
  this.pass = hash;
  next();
});
module.exports = model("User", UserSchema);
