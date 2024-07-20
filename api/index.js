import Controller from "./Control.js"

const controller = new Controller()

controller.InitRouten()

controller.InitUse()

controller.ListenServer()

controller.InitMongoDB()
