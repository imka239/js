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
    return f(...result)
};

const cnst = a => () => a;
let variable = (name) => {
    const id = vars[name];
    return (...args) => args[id]
};


const subtract = operation((a, b) => (a - b));
const multiply = operation((a, b) => (a * b));
const add = operation((a, b) => a + b);
const divide = operation((a, b) => a / b);
const negate = operation((a) => -a);
const min3 = operation(Math.min);
const max5 = operation(Math.max);
const avg5 = operation((...args) => args.reduce((a, b) => a + b) / args.length);
const med3 = operation((...args) => args.sort((x, y) => (x - y))[Math.floor(args.length / 2)]);
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

const VARIABLE = {};
for (v in vars) {
    VARIABLE[v] = variable(v);
}

const parse = source => {
    let stack = [];
    source.split(' ').filter(s => s.length > 0).forEach(token => {
        if (token in consts) {
            stack.push(consts[token])
        } else if (token in oper) {
            let args = stack.splice(stack.length - need[token], need[token]);
            stack.push(oper[token](...args))
        } else if (token in vars) {
            stack.push(VARIABLE[token]);
        } else {
            stack.push(cnst(Number(token)));
        }
    });
    return stack.pop()
};


console.log(parse('3.3 y -'))