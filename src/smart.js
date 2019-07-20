const myFunction = (str) => "Hi " + str

const result = "hmhmhmhm" |> myFunction

result
  |> console.log("dude", #)

// result
//   |> console.log("dude", ?)

const asyncLog = async (yea) => {
  console.log("dude", yea)
}

const asyncFunction = async () => {
const r = result |> await asyncLog(#)

console.log(r)

}


asyncFunction()