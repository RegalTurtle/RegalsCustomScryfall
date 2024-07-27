input = "\"Saint Marcus\" s:mtd"

var params = input.toLowerCase().match(/(?:[^\s"]+|"[^"]*")+/g);

console.log(params)