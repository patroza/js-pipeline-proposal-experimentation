const myFunction = (str) => "Hi " + str

const result = "hmhmhmhm" |> myFunction

result
  |> (_ => console.log("dude", _))

// result
//   |> console.log("dude", ?)
