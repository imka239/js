let Operation = {
    evaluate : function (...args) {return this.getOperation()(...this.getArgs().map(arg => arg.evaluate(...args)))},
    diff : function (name) {
        return this.getDiff()(...this.getArgs(), ...this.getArgs().map(arg => arg.diff(name)));
    },
    prefix : function () {
        let res = "(" + this.getSymbol() + " ";
        let i = 0;
        let to = this.getArgs().length - 1;
        while (i < to) {
            res += this.getArgs()[i].prefix() + " "; i++;
        }
        res += this.getArgs()[to].prefix() + ")";
        return res;
    },
    postfix : function () {
        let res = "(";
        let i = 0;
        let to = this.getArgs().length;
        while (i < to) {
            res += this.getArgs()[i].postfix() + " "; i++;
        }
        if (to === 0) {
            res += " ";
        }
        res += this.getSymbol() + ")";
        return res;
    },
    simplify : function () {
        let simpleArgs = this.getArgs().map(arg => arg.simplify());
        let onlyConst = 1;
        simpleArgs.forEach(token => {if (!isConst(token)) {onlyConst = 0;}});
        if (onlyConst) {
            return new Const(new this.constructor(...simpleArgs).evaluate());
        }
        if (this.getSimplifier() !== undefined) {
            return this.getSimplifier()(...simpleArgs);
        }
        return this.constructor(...simpleArgs);
    }
};
function generator(sym, op, diff_impl, simpl_impl) {
    let ret = function (...arg) {
        this.getArgs = function () {
            return arg;
        };
        this.getOperation = function () {
            return op;
        };
        this.getSymbol = function () {
            return sym;
        };
        this.getDiff = function () {
            return diff_impl;
        };
        this.getSimplifier = function () {
            return simpl_impl;
        };
    };
    ret.prototype = Object.create(Operation);
    ret.prototype.constructor = ret;
    return ret;
}

const Negate = generator("negate", a => -a, (a, da) => new Negate(da));
const Sumexp = generator("sumexp",
    function (...args) {
        let ans = 0;
        if (args.length === 0) {
            return 0;
        }
        for (i of args) {
            ans += Math.pow(Math.E, i);
        }
        return ans;
    }, (a, da) => new Negate(da));
const Softmax = generator("softmax",
    function (...args) {
        let ans = Math.pow(Math.E, args[0]);
        let res = 0;
        for (i of args) {
            res += Math.pow(Math.E, i);
        }
        return ans / res;
    }, (a, da) => new Negate(da));
const ArcTan = generator("atan", a => Math.atan(a),(a, da) => new Divide(da, new Add(new Const(1), new Multiply(a, a))));
const Add = generator("+", (a, b) => a + b, (a, b, da, db) => new Add(da, db), (a, b) => {
    if (isZero(a)) {
        return b;
    }
    if (isZero(b)) {
        return a;
    }
    return new Add(a, b);
});
const Subtract = generator("-", (a, b) => a - b,(a, b, da, db) => new Subtract(da, db),(a, b) => {
    if (isZero(b)) {
        return a;
    }
    if (isZero(a)) {
        return new Negate(b);
    }
    return new Subtract(a, b);
});
const ArcTan2 = generator("atan2",(a, b) => Math.atan2(a, b),(a, b, da, db) => new Divide(new Subtract(new Multiply(da, b), new Multiply(db, a)), new Add(new Multiply(a, a), new Multiply(b, b))),
    (a, b) => {
        if (isZero(a) && !isZero(b)) {
            return new Const(0);
        }
        if (isOne(b)) {
            return new ArcTan(a);
        }
        return new ArcTan2(a, b);
    });
const Multiply = generator("*", (a, b) => a * b, (a, b, da, db) => new Add(new Multiply(a, db), new Multiply(da, b)),
    (a, b) => {
        if (isZero(a) || isZero(b)) {
            return new Const(0);
        }
        if (isOne(a)) {
            return b;
        }
        if (isOne(b)) {
            return a;
        }
        return new Multiply(a, b);
    });
const Divide = generator("/", (a, b) => a / b,(a, b, da, db) => new Divide(new Subtract(new Multiply(da, b), new Multiply(db, a)), new Multiply(b, b)),
    (a, b) => {
        if (isZero(a)) {
            return new Const(0);
        }
        if (isOne(b)) {
            return a;
        }
        return new Divide(a, b);
    });

const Simple = {
    simplify : function() {return this;}
};

const Const = function(val) {
    this.val = val;
    this.getValue = function () {
        return this.val;
    }
};
Const.prototype = Object.create(Simple);
Const.prototype.evaluate = function () { return this.getValue(); };
Const.prototype.toString = Const.prototype.prefix = Const.prototype.postfix = function () { return this.getValue().toString(); };
Const.prototype.diff = function () { return new Const(0); };

let ONE = new Const(1);
let ZERO = new Const(0);

const vars = {
    "x" : 0,
    "y" : 1,
    "z" : 2,
    "u" : 3,
    "v" : 4,
    "w" : 5
};

const Variable = function(name) {
    this.name = name;
    this.getName = function () {
        return this.name;
    }
};
Variable.prototype = Object.create(Simple);
Variable.prototype.evaluate = function (...args) { return args[vars[this.getName()]]; };
Variable.prototype.toString = Variable.prototype.postfix = Variable.prototype.prefix = function () { return this.getName(); };
Variable.prototype.diff = function (val) { return val === this.getName() ? ONE : ZERO; };

const OPER = {
    "+" : Add,
    "-" : Subtract,
    "*" : Multiply,
    "/" : Divide,
    "negate" : Negate,
    "atan" : ArcTan,
    "atan2" : ArcTan2
};
const NEED = {
    "+" : 2,
    "-" : 2,
    "*" : 2,
    "/" : 2,
    "negate" : 1,
    "atan" : 1,
    "atan2" : 2
};

function ParserException(message, expr, ind) {
    if (expr === null) {
        this.message = message;
    } else {
        this.message = message + " in index '" + ind + "'\n'" + expr + "'\n";
        for (var i = 0; i < ind + 1; i++)
            this.message += " ";
        this.message += "^\n";
    }
}

ParserException.prototype = Object.create(Error.prototype);
ParserException.prototype.name = "ParserException";
ParserException.prototype.constructor = ParserException;

let ind = 0;
let stack = [];
let exp = "";

isDigit = (a) => (a >= "0" && a <= "9") || (ind < exp.length && a === '-' &&
    exp.charAt(ind + 1) <= '9' && exp.charAt(ind + 1) >= "0");
isLetter = (a) => (a >= "a" && a <= "z") || (a <= "Z" && a >= "A");
skipWhiteSpaces = () => {
    while (ind < exp.length && exp.charAt(ind) === " ") {
        ind++;
    }
};

parseNumber = () => {
    let ans = "";
    while (ind < exp.length && isDigit(exp.charAt(ind))) {
        let cur = exp.charAt(ind);
        ans += cur;
        ind++;
    }
    return Number(ans);
};

parseWord = () => {
    let ans = "";
    while (ind < exp.length && exp.charAt(ind) !== ")" && exp.charAt(ind) !== " " && exp.charAt(ind) !== '(') {
        let cur = exp.charAt(ind);
        ans += cur;
        ind++;
    }
    return ans;
};

checkChar = () => exp.charAt(ind);
last = () => stack[stack.length - 1];

function parse() {
    let args = [];
    while (stack.length > 0 && OPER[last()] === undefined) {

        if (last() === '(') {
            throw new ParserException("No Operation", exp, stack.length);
        }
        args.push(last());
        stack.pop();
    }
    if (stack.length === 0) {
        throw new ParserException("Don't have Argument", exp, ind);
    }
    let op = stack.pop();
    if (stack.length > 0 && last() === '(') {
        stack.pop();
    } else {
        throw new ParserException("No open Brace", exp, ind);
    }
    args.reverse();
    if (NEED[op] !== args.length) {
        throw new ParserException("Too many args", exp, ind);
    }
    return new OPER[op](...args);
}

function parsePost() {
    let args = [];
    let op = stack.pop();
    console.log(op);
    if (OPER[op] === undefined) {
        throw new ParserException("No Operation", exp, ind)
    }
    while (stack.length > 0 && last() !== '(') {
        args.push(last());
        stack.pop();
    }
    if (stack.length === 0) {
        throw new ParserException("Don't have Argument", exp, ind);
    }
    console.log(last());
    if (stack.length > 0 && last() === '(') {
        stack.pop();
    } else {
        throw new ParserException("Don't Have Open Brace", exp, ind);
    }
    args.reverse();
    if (NEED[op] !== args.length) {
        throw new ParserException("Too many args", exp, ind);
    }
    return new OPER[op](...args);
}

function parsePostfix(source) {
    ind = 0;
    stack = [];
    let balance = 0;
    exp = source;
    if (exp === "") {
        throw new ParserException("Empty input", null, 0);
    }
    while (true) {
        skipWhiteSpaces();
        if (ind >= exp.length) {
            break;
        }
        let cur = exp.charAt(ind);
        if (isDigit(cur)) {
            stack.push(new Const(parseNumber()));
            continue;
        }
        cur = checkChar();
        if (cur === '(') {
            stack.push('(');
            balance++;
            ind++;
            continue;
        } else if (cur === ')') {
            balance--;
            if (balance < 0) {
                throw new ParserException("Not Enough Brackets", exp, ind);
            }
            ind++;
            stack.push(parsePost());
            continue;
        }
        cur = parseWord();
        if (vars[cur] !== undefined) {
            stack.push(new Variable(cur));
        } else if (cur in OPER) {
            stack.push(cur);
        } else {
            throw new ParserException("Argument undefined", exp, ind);
        }
    }
    if (balance > 0) {
        throw new ParserException("not Enough Brackets", exp, ind);
    }
    if (stack.length > 1) {
        throw new ParserException("Not Enough Operation after all arguments", null, exp.length);
    }
    return stack.pop();
}

function parsePrefix(source) {
    ind = 0;
    stack = [];
    let balance = 0;
    exp = source;
    if (exp === "") {
        throw new ParserException("Empty input", null, 0);
    }
    while (true) {
        skipWhiteSpaces();
        if (ind >= exp.length) {
            break;
        }
        let cur = exp.charAt(ind);
        if (isDigit(cur)) {
            stack.push(new Const(parseNumber()));
            continue;
        }
        cur = checkChar();
        if (cur === '(') {
            stack.push('(');
            balance++;
            ind++;
            continue;
        } else if (cur === ')') {
            balance--;
            if (balance < 0) {
                throw new ParserException("Not Enough Brackets", exp, ind);
            }
            ind++;
            stack.push(parse());
            continue;
        }
        cur = parseWord();
        if (vars[cur] !== undefined) {
            stack.push(new Variable(cur));
        } else if (cur in OPER) {
            stack.push(cur);
        } else {
            throw new ParserException("Argument undefined", exp, ind);
        }
    }
    if (balance > 0) {
        throw new ParserException("not Enough Brackets", exp, ind);
    }
    if (stack.length > 1) {
        throw new ParserException("Not Enough Operation after all arguments", null, exp.length);
    }
    return stack.pop();
}
console.log(parsePostfix('(x 2 +)'));