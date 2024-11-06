import mongoose from "mongoose"
import crypto from "crypto"
import express from "express"
import pkg from "lodash"
import http from "http"
const { get, merge } = pkg

class Model {
  constructor() {
    this.App = express()

    this.CsvDB = http.createServer(this.App)

    this.MongoURL =
      "mongodb+srv://lorenzo123696:lollp123@cluster0.8wsnvma.mongodb.net/?retryWrites=true&w=majority"

    this.Router = express.Router()

    this.SECRET = "CSVDB-REST-API"

    this.Schema = {
      Username: String,
      Email: String,
      Authentication: {
        Password: String,
        Salt: String,
        SessionToken: String,
      },
      CurrentTables: [],
    }

    this.UserSchema = new mongoose.Schema(this.Schema)

    this.UserModel = mongoose.model("User", this.UserSchema)
    this.CorsOptions = {
      origin: ["http://localhost:3000"],
      credentials: true,
      optionSuccessStatus: 200,
      exposedHeaders: ["set-cookie"],
    }
  }

  GetUsers = async () => await this.UserModel.find()

  GetUserByEmail = async (Email) => await this.UserModel.findOne({ Email })

  GetUserByEmailSelect = async (Email) =>
    await this.UserModel.findOne({ Email }).select(
      "+Authentication.Salt +Authentication.Password"
    )

  GetUserById = async (id) => await this.UserModel.findById(id)

  DeleteUserById = async (id) =>
    await this.UserModel.findOneAndDelete({ _id: id })

  UpdateUserById = async (id, value) =>
    await this.UserModel.findByIdAndUpdate(id, value)

  GetUserBySessionToken = async (SessionToken) =>
    await this.UserModel.findOne({
      "Authentication.SessionToken": SessionToken,
    })

  CreateUser = async (value) =>
    (await new this.UserModel(value).save()).toObject()

  // Helpers

  Random = () => crypto.randomBytes(128).toString("base64")

  Authentication = (salt, password) =>
    crypto
      .createHmac("sha256", [salt, password].join("/"))
      .update(this.SECRET)
      .digest("hex")

  // Middlewares

  async IsAuthenticated(req, res, next) {
    try {
      const SessionToken = req.cookies["CSVDB-AUTH"]

      if (!SessionToken) return res.sendStatus(403)

      const ExistingUser = await this.GetUserBySessionToken(SessionToken)

      if (!ExistingUser) return res.sendStatus(403)

      merge(req, { Identity: ExistingUser })

      return next()
    } catch (e) {
      console.log(e)
      return res.sendStatus(400)
    }
  }

  async IsOwner(req, res, next) {
    try {
      const { id } = req.params

      const CurrentUserId = get(req, "Identity._id")

      if (!CurrentUserId) return res.sendStatus(400)

      if (CurrentUserId.toString() !== id) return res.sendStatus(403)

      return next()
    } catch (e) {
      console.log(e)
      return res.sendStatus(400)
    }
  }
}

export default Model
