import mongoose , {Schema} from "mongoose"

const subscriptionSchema = new mongoose.Schema(
    {
        subscriber : {
             type : Schema.Types.ObjectId, 
             ref : "User"
        },
        Channel : {
             type : Schema.Types.ObjectId, 
             ref : "User"
        }
    },
    {
        timestamps : true
    }
)
export const Subscription = new mongoose.model("Subscription" , subscriptionSchema)