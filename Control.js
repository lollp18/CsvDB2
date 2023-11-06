import Model from "./Model.js"
import express from "express"
import mongoose from "mongoose"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import compression from "compression"
import cors from "cors"

class Controller extends Model {
  constructor() {
    super()

    this.PathRegistrieren = "/auth/registrieren"

    this.PathLogin = "/auth/login"

    this.PathUsers = "/users"

    this.PathDeleteAndUpdateUsers = this.PathUsers + "/:id"

    this.PathUserTables = "/user/:id/tables"
  }

  InitRouten() {
    this.Registrieren()
    this.Anmelden()
    this.SetGetAllUsers()
    this.SetDeleteUsers()
    this.SetUpdateUser()
    this.SetGetUserTables()
  }

  InitUse() {
    this.App.use(cors(this.CorsOptions))
    this.App.use(express.json())
    this.App.use(compression())
    this.App.use(cookieParser())
    this.App.use(bodyParser.json())
    this.App.use("/", this.Router)
  }

  ListenServer() {
    this.CsvDB.listen(8080, () => {
      this.App.get("/", (req, res) => {
        res.send(
          "<h1>CsvDB</h1><a href='http://localhost:8080/auth/registriren' >registriren<a>"
        )
      })
      console.log("Server running on http://localhost:8080/")
    })
  }

  InitMongoDB() {
    mongoose.Promise = Promise

    mongoose.connect(this.MongoURL)

    mongoose.connection.on("error", (e) => {
      console.error(e)
    })
  }

  Anmelden() {
    this.Router.post(this.PathLogin, this.Login.bind(this))
  }

  Registrieren() {
    this.Router.post(this.PathRegistrieren, this.Register.bind(this))
  }

  async Register(req, res) {
    try {
      const { Email, Username, Passwort } = req.body
      console.log(req.body)
      if (!Email || !Passwort || !Username) {
        return res.status(202).send("Alle Felder ausfüllen")
      }

      const ExistingUser = await this.GetUserByEmail(Email)

      if (ExistingUser) {
        return res.status(202).send("User already exists")
      }

      const Salt = this.Random()
      const Password = this.Authentication(Salt, Passwort)
      const User = await this.CreateUser({
        Username,
        Email,
        Authentication: {
          Password: Password,
          Salt,
        },
        Tabellen: [],
      })

      return res.status(201).json(User).end()
    } catch (error) {
      console.log(error)
      return res.send("Server error: " + error.message)
    }
  }

  async Login(req, res) {
    try {
      const { Email, Passwort } = req.body

      if (!Email || !Passwort) {
        return res.status(202).send("Alle Felder ausfüllen")
      }

      const User = await this.GetUserByEmailSelect(Email)

      if (!User) {
        return res.status(202).send("Diesen User gibt es nicht")
      }

      const ExpectedHash = this.Authentication(
        User.Authentication.Salt,
        Passwort
      )

      if (User.Authentication.Password !== ExpectedHash) {
        return res.status(202).send("Passwort Falsch")
      }

      const Salt = this.Random()
      User.Authentication.SessionToken = this.Authentication(
        Salt,
        User._id.toString()
      )

      await User.save()

      res.cookie("CSVDB-AUTH", User.Authentication.SessionToken, {
        Domain: "localhost:5173",
        Path: "/",
        sameSite: "none",
        secure: true,
        maxAge: 900000,
      })

      return res.status(201).json(User).end()
    } catch (e) {
      console.log(e)
      return res.send("Server error: " + e)
    }
  }

  //Users

  SetGetAllUsers() {
    this.Router.get(
      this.PathUsers,
      this.IsAuthenticated.bind(this),
      this.GetAllUsers.bind(this)
    )
  }

  async GetAllUsers(req, res) {
    try {
      const Users = await this.GetUsers()

      return res.status(200).json(Users)
    } catch (e) {
      console.log(e)
      return res.send("Server error: " + e)
    }
  }

  SetDeleteUsers() {
    this.Router.delete(
      this.PathDeleteAndUpdateUsers,
      this.IsAuthenticated.bind(this),
      this.IsOwner.bind(this),
      this.DeleteUsers.bind(this)
    )
  }

  async DeleteUsers(req, res) {
    try {
      const { id } = req.params

      const DeleteUser = await this.DeleteUserById(id)

      return res.json(DeleteUser)
    } catch (e) {
      console.log(e)
      return res.send("Server error: " + e)
    }
  }

  SetUpdateUser() {
    this.Router.patch(
      this.PathDeleteAndUpdateUsers,
      this.IsAuthenticated.bind(this),
      this.IsOwner.bind(this),
      this.UpdateUser.bind(this)
    )
  }

  async UpdateUser(req, res, next) {
    try {
      const { Username } = req.body
      const { id } = req.params
      if (!Username) {
        return res.sendStatus(400)
      }
      const User = await this.GetUserById(id)
      console.log(User)
      User.Username = Username

      await User.save()

      return res.status(200).json(User).end()
    } catch (e) {
      console.log(e)
      return res.sendStatus(400)
    }
  }

  SetGetUserTables() {
    this.Router.patch(
      this.PathUserTables,
      this.IsAuthenticated.bind(this),
      this.IsOwner.bind(this),
      this.GetUserTables.bind(this)
    )
  }

  async GetUserTables(id) {
    try {
      const { id } = req.params
      if (!id) {
        return res.sendStatus(400)
      }
      const User = await this.GetUserById(id)

      const UserTables = User.Tabellen

      return res.status(200).json(UserTables).end()
    } catch (e) {
      console.log(e)
      return res.sendStatus(400)
    }
  }
}

export default Controller
