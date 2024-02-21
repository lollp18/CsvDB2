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
      origin: ["http://localhost:5173", "https://csv2.netlify.app"],
      credentials: true,
      optionSuccessStatus: 200,
      exposedHeaders: ["set-cookie"],
    }
  }

  async GetUsers() {
    return await this.UserModel.find()
  }

  async GetUserByEmail(Email) {
    return await this.UserModel.findOne({ Email })
  }

  async GetUserByEmailSelect(Email) {
    const Select = "+Authentication.Salt +Authentication.Password"

    return await this.UserModel.findOne({ Email }).select(Select)
  }

  async GetUserById(id) {
    return await this.UserModel.findById(id)
  }

  async DeleteUserById(id) {
    return await this.UserModel.findOneAndDelete({ _id: id })
  }

  async UpdateUserById(id, value) {
    return await this.UserModel.findByIdAndUpdate(id, value)
  }

  async GetUserBySessionToken(SessionToken) {
    const FilterCondition = {
      "Authentication.SessionToken": SessionToken,
    }
    return await this.UserModel.findOne(FilterCondition)
  }

  async CreateUser(value) {
    const user = await new this.UserModel(value).save()
    return user.toObject()
  }

  // Helpers

  Random() {
    return crypto.randomBytes(128).toString("base64")
  }

  Authentication(salt, password) {
    return crypto
      .createHmac("sha256", [salt, password].join("/"))
      .update(this.SECRET)
      .digest("hex")
  }

  // Middlewares

  async IsAuthenticated(req, res, next) {
    try {
      const SessionToken = req.cookies["CSVDB-AUTH"]

      if (!SessionToken) {
        return res.sendStatus(403)
      }

      const ExistingUser = await this.GetUserBySessionToken(SessionToken)

      if (!ExistingUser) {
        return res.sendStatus(403)
      }

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

      if (!CurrentUserId) {
        return res.sendStatus(400)
      }

      if (CurrentUserId.toString() !== id) {
        return res.sendStatus(403)
      }
      return next()
    } catch (e) {
      console.log(e)
      return res.sendStatus(400)
    }
  }
}

export default Model
