const Simple = function () {};
Simple.prototype.simplify = function() {return this;};

const vars = {
    "x" : 0,
    "y" : 1,
    "z" : 2,
    "u" : 3,
    "v" : 4,
    "w" : 5
};

const Const = function(val) {
    this.val = val;
};

Const.prototype = Object.create(Simple.prototype);
Const.prototype.evaluate = function () { return this.val; };
Const.prototype.toString = Const.prototype.postfix = Const.prototype.prefix = function () { return this.val.toString(); };
Const.prototype.diff = function () { return ZERO; };
Const.prototype.isConst = true;

const isConst = function (x) {
    return x !== undefined && x.isConst !== undefined;
};

const isZero = x => x.isConst && x.val === 0;
const isOne = x => x.isConst && x.val === 1;

const ONE = new Const(1);
const ZERO = new Const(0);

const Variable = function(name) {
    this.id = vars[name];
    this.name = name;
};
Variable.prototype = Object.create(Simple.prototype);
Variable.prototype.evaluate = function (...args) {  return args[this.id]; };
Variable.prototype.toString = Variable.prototype.prefix = Variable.prototype.postfix = function () { return this.name; };
Variable.prototype.diff = function (val) { return (val === this.name ? ONE : ZERO); };

let Operation = function(){};
Operation.prototype.evaluate = function (...args) { return this.getOperation(...this.getArgs.map(arg => arg.evaluate(...args)))};
Operation.prototype.toString = function () { return this.getArgs.join(" ") + " " + this.getSymbol; };
Operation.prototype.prefix = function () {
    return this.getArgs.reduce((ret, arg) => ret + " " + arg.prefix(), "(" + this.getSymbol) + (this.getArgs.length ? "" : " ") + ")";
};
Operation.prototype.postfix = function () {
    return this.getArgs.reduce((ret, arg) => ret + arg.postfix() + " ", "(") + (this.getArgs.length ? "" : " ") + this.getSymbol + ")";
};
Operation.prototype.diff = function (name) { return this.getDiff(...this.getArgs, ...this.getArgs.map(arg => arg.diff(name))); };
Operation.prototype.simplify = function () {
    let simpleArgs = this.getArgs.map(arg => arg.simplify());
    let onlyConst = simpleArgs.every(isConst);
    if (onlyConst) {
        return new Const(new this.constructor(...simpleArgs).evaluate());
    }
    if (this.getSimplifier !== undefined) {
        return this.getSimplifier(...simpleArgs);
    }
    return this.constructor(...simpleArgs);
};

function generator(sym, op, diff_impl, simpl_impl) {
    let ret = function (...arg) {
        this.getArgs = arg;
        this.getOperation = op;
        this.getSymbol = sym;
        this.getDiff = diff_impl;
        this.getSimplifier = simpl_impl;
    };
    ret.prototype = Object.create(Operation.prototype);
    ret.prototype.constructor = ret;
    return ret;
}
const Negate = generator("negate", (a) => -a,
    (a, da) => new Negate(da));

const ArcTan = generator("atan", Math.atan,
    (a, da) => new Divide(da, new Add(ONE, new Multiply(a, a))));

const Add = generator("+", (a, b) => a + b,
    (a, b, da, db) => new Add(da, db),
    (a, b) => {
        if (isZero(a)) {
            return b;
        }
        if (isZero(b)) {
            return a;
        }
        return new Add(a, b);
    });

const Subtract = generator("-", (a, b) => a - b,
    (a, b, da, db) => new Subtract(da, db),
    (a, b) => {
        if (isZero(b)) {
            return a;
        }
        if (isZero(a)) {
            return new Negate(b);
        }
        return new Subtract(a, b);
    });

const ArcTan2 = generator("atan2",(a, b) => Math.atan2(a, b),
    (a, b, da, db) => new Divide(new Subtract(new Multiply(da, b), new Multiply(db, a)),
        new Add(new Multiply(a, a), new Multiply(b, b))),
    (a, b) => {
        if (isZero(a) && !isZero(b)) {
            return new Const(0);
        }
        if (isOne(b)) {
            return new ArcTan(a);
        }
        return new ArcTan2(a, b);
    });

const Multiply = generator("*", (a, b) => a * b,
    (a, b, da, db) => new Add(new Multiply(a, db), new Multiply(da, b)),
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

const Divide = generator("/", (a, b) => a / b,
    (a, b, da, db) => new Divide(new Subtract(new Multiply(da, b), new Multiply(db, a)), new Multiply(b, b)),
    (a, b) => {
        if (isZero(a)) {
            return new Const(0);
        }
        if (isOne(b)) {
            return a;
        }
        return new Divide(a, b);
    });

const Sumexp = generator("sumexp", (...arr) => arr.reduce((ret, val) => ret + Math.exp(val), 0),
    (...arr) => {
        let ret = ZERO;
        let half = arr.length / 2;
        for (let i = 0; i < half; ++i) {
            ret = new Add(ret, new Multiply(new Sumexp(arr[i]), arr[i + half]));
        }
        return ret;
    }
);

const Softmax = generator("softmax",
    (...arr) => Math.exp(arr[0]) / arr.reduce((a, b) => a + Math.exp(b), 0),
    (...arr) => {
        let ans = ZERO;
        let half = arr.length / 2;
        let halfexp = new Sumexp(...arr.slice(0, half));
        for (let i = 0; i < half; ++i) {
            ans = new Add(ans, new Multiply(new Sumexp(arr[i]), arr[i + half]));
        }
        return new Divide(new Subtract(new Multiply(new Multiply(new Sumexp(arr[0]), arr[half]), halfexp), new Multiply(ans, new Sumexp(arr[0]))),
            new Multiply(halfexp, halfexp));
    }
);


const OPER = {
    "+" : [Add, 2],
    "-" : [Subtract, 2],
    "*" : [Multiply, 2],
    "/" : [Divide, 2],
    "negate" : [Negate, 1],
    "atan" : [ArcTan, 1],
    "atan2" : [ArcTan2, 2],
    "softmax" : [Softmax, 0],
    "sumexp" : [Sumexp, 0]
};

const VARIABLE = {};
for (let v in vars) {
    VARIABLE[v] = new Variable(v);
}

const parse = source => {
    let stack = [];
    source.split(' ').filter(s => s.length > 0).forEach(token => {
        if (token in OPER) {
            let args = stack.splice(-OPER[token][1]);
            stack.push(new OPER[token][0](...args))
        } else if (token in VARS) {
            stack.push(VARIABLE[token]);
        } else {
            stack.push(new Const(Number(token)));
        }
    });
    return stack.pop()
};

function ParseException(message) {
    this.message = message;
}
ParseException.prototype = Object.create(Error.prototype);
ParseException.prototype.name = "ParseException";
ParseException.prototype.constructor = ParseException;

const genParser = mode =>
    function(source) {
        //console.log(source);
        let i = 0;
        const fail = (expected, found, where) => {
            let info = "";
            for (let j = 0; j < where; j++) {
                info += " ";
            }
            info += "^";
            throw new ParseException("expected : " + expected + ", found: " + found + '\n' + source + '\n' + info);
        };

        if (source.length === 0) {
            fail("expression", "''");
        }

        function skipWhiteSpace() {
            while (i < source.length && /\s/.test(source.charAt(i))) {
                i++;
            }
        }

        function readWord() {
            skipWhiteSpace();
            let start = i;
            //console.log(i);
            if ("()".includes(source.charAt(i))) {
                return source.charAt(i++);
            }
            while (i < source.length && !/[\s()]/.test(source.charAt(i))) {
                i++;
                //console.log(i);
            }
            return source.substring(start, i);
        }

        function readOperation() {
            //console.log(i);
            let op = readWord();
            //.log(i);
            if (!(op in OPER)) {
                fail("operation", "'" + op + "'", i - 1);
            }
            //.log(i);
            return op;
        }

        function testValue() {
            if (/[xyz\d(]/.test(source.charAt(i))) {
                return true;
            }
            if (source.charAt(i) !== '-' || !/\d/.test(source.charAt(i + 1))) {
                return false;
            }
            let start = i;
            i++;
            while (i < source.length && !/[\s()]/.test(source.charAt(i))) {
                if (!/\d/.test(source.charAt(i))) {
                    i = start;
                    return false;
                }
                i++;
            }
            i = start;
            return true;
        }

        function readArgs(args, cnt) {
            //console.log(i);
            skipWhiteSpace();
            for (let j = 0; (cnt === 0 || j < cnt) && i < source.length && source.charAt(i) !== ')'; j++) {
                if (!testValue()) {
                    break;
                }
                args.push(parser());
                skipWhiteSpace();
            }
        }
        const prefixParser = (args) => {
            //.log(i);
            let ret = readOperation();
            //.log(i);
            readArgs(args, OPER[ret][1]);
            return ret;
        };

        const postfixParser = (args) => {
            readArgs(args, 0);
            return readOperation();
        };

        const Mode = {
            "prefix" : prefixParser,
            "postfix" : postfixParser
        };

        let MODE = Mode[mode];

        function parser() {
            let tkn = readWord();
            if (tkn === '(') {
                let args = [];
                let start = i;
                let op = MODE(args);
                //.log(i);
                skipWhiteSpace();
                let amount = OPER[op][1] || 0;
                if (source.charAt(i) !== ')') {
                    fail("), (" + amount + " argument_s) for '" + op + "'", "'" + source.charAt(i) + "'", i);
                }
                if (amount && args.length !== OPER[op][1]) {
                    fail(amount + " argument_s", args.length + " arguments", start, i - start - 1);
                }
                i++;
                return new OPER[op][0](...args);
            }
            if (tkn in vars) {
                return VARIABLE[tkn];
            }
            let val = Number(tkn);
            if (!isNaN(val)) {
                return new Const(val);
            }
            fail("value", tkn, i - tkn.length, tkn.length - 1);
        }

        let res = parser();
        skipWhiteSpace();
        if (i !== source.length) {
            fail("eof", source.charAt(i), i);
        }
        return res;
    };

const parsePrefix = genParser("prefix");
const parsePostfix = genParser("postfix");