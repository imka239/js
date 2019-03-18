const vars = {
    "x" : 0,
    "y" : 1,
    "z" : 2,
    "u" : 3,
    "v" : 4,
    "w" : 5
};

const operation = f => (...args) => (...eval) => {
    let result = args.map(arg => arg(...eval));
    //let res = []
    //for (const arg of args) {
    //    res.push(arg(...eval))
    //}
    return f(...result)
};

const cnst = a => () => a;
function variable(name) {
    return (...args) => args[vars[name]];
}

const subtract = operation((a, b) => (a - b));
const multiply = operation((a, b) => (a * b));
const add = operation((a, b) => a + b);
const divide = operation((a, b) => a / b);
const negate = operation((a) => -a);
const min3 = operation(() => Math.min.apply(null, arguments));
const max5 = operation(() => Math.max.apply(null, arguments));
const avg5 = operation((...args) => args.reduce((a, b) => a + b) / 5);
const med3 = operation((...args) => args.sort((x, y) => (x - y))[1]);
const e = cnst(Math.E);
const pi = cnst(Math.PI);

const consts = {
    "e" : e,
    "pi" : pi
};

const oper = {
    "+" : add,
    "-" : subtract,
    "*" : multiply,
    "/" : divide,
    "negate" : negate,
    "min3" : min3,
    "max5" : max5,
    "avg5" : avg5,
    "med3" : med3

};

const need = {
    "+" : 2,
    "-" : 2,
    "*" : 2,
    "/" : 2,
    "negate" : 1,
    "min3" : 3,
    "max5" : 5,
    "avg5" : 5,
    "med3" : 3

};

const parse = source => {
    let stack = [];
    const tokens = source.split(' ').filter(s => s.length > 0);
    for (let i of tokens) {
        if (i in consts) {
            stack.push(consts[i])
        } else if (i in oper) {
            let args = stack.splice(stack.length - need[i], need[i]);
            stack.push(oper[i](...args))
        } else if (i in vars) {
            stack.push(variable(i))
        } else {
            stack.push(cnst(parseInt(i)));
        }
    }
    return stack.pop()
};


console.log(parse('3 y -'))