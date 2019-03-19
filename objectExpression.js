const isConst = x => x instanceof Const;
const isZero = x => isConst(x) && x.evaluate() === 0;
const isOne = x => isConst(x) && x.evaluate() === 1;

const vars = {
    "x" : 0,
    "y" : 1,
    "z" : 2,
    "u" : 3,
    "v" : 4,
    "w" : 5
};

const Const = function(x) {
    this.evaluate = () => x;
    this.toString = () => x + "";
    this.diff = () => new Const(0);
    this.simplify = () => this
};

const Variable = function(x) {
    this.evaluate = (...args) => args[vars[x]];
    this.diff = (val) => new Const(val === x ? 1 : 0);
    this.toString = () => x + "";
    this.simplify = () => this
};

const Op = {
    evaluate: (operation) => (...args) => (...vars) => {
        return operation(...args.map(arg => arg.evaluate(...vars)));
    }
    , toString : (...args) => {
        let s = "";
        for (i of args) {
            s += i + " ";
        }
        return s;
    }
    , diff : (arg) => (val) => arg.diff(val)
    , simplify : (operation, Op) => (...args) => {
        args = args.map(arg => arg.simplify());
        let onlyConst = 1;
        args.forEach(token => {if (!isConst(token)) {onlyConst = 0;}});
        if (onlyConst) {
            return new Const(operation(...args.map(arg => arg.evaluate())));
        } else {
            return new Op(...args);
        }
    }
};


function Negate(x) {
    this.evaluate = Op.evaluate(a => -a)(x);
    this.diff = (val) => new Negate(Op.diff(x)(val));
    this.toString = () => Op.toString(x) + "negate";
    this.simplify = () => Op.simplify(a => -a, Negate)(x);
}

function ArcTan(x) {
    this.evaluate = Op.evaluate(a => Math.atan(a))(x);
    this.diff = (val) => new Divide(Op.diff(x)(val), new Add(new Const(1), new Multiply(x, x)));
    this.toString = () => Op.toString(x) + "atan";
    this.simplify = () => Op.simplify(a => Math.atan(a), ArcTan)(x);
}

function Add(x, y) {
    this.evaluate = Op.evaluate((a, b) => a + b)(x, y);
    this.diff = (val) => new Add(Op.diff(x)(val), Op.diff(y)(val));
    this.toString = () => Op.toString(x, y) + "+";
    this.simplify = () => {
        let simple = Op.simplify((a, b) => a + b, Add)(x, y);
        let simpleX = x.simplify();
        let simpleY = y.simplify();
        if (isZero(simpleX)) {
            return simpleY;
        }
        if (isZero(simpleY)) {
            return simpleX;
        }
        return simple;
    }
}

function ArcTan2(x, y) {
    this.evaluate = Op.evaluate((a, b) => Math.atan2(a, b))(x, y);
    this.diff = (val) => new Divide(new Subtract(new Multiply(Op.diff(x)(val), y), new Multiply(x, Op.diff(y)(val))),
        new Add(new Multiply(x, x), new Multiply(y, y)));
    this.toString = () => Op.toString(x, y) + "atan2";
    this.simplify = () => Op.simplify((a, b) => Math.atan2(a, b), ArcTan2)(x, y);
}

function Subtract(x, y) {
    this.evaluate = Op.evaluate((a, b) => a - b)(x, y);
    this.diff = (val) => new Subtract(x.diff(val), y.diff(val));
    this.toString = () => Op.toString(x, y) + "-";
    this.simplify = () => {
        let simple = Op.simplify((a, b) => a - b, Subtract)(x, y);
        let simpleX = x.simplify();
        let simpleY = y.simplify();
        if (isZero(simpleX)) {
            return new Negate(simpleY).simplify();
        }
        if (isZero(simpleY)) {
            return simpleX;
        }
        return simple;
    }
}

function Multiply(x, y) {
    this.evaluate = Op.evaluate((a, b) => a * b)(x, y);
    this.toString = () => Op.toString(x, y) + "*";
    this.diff = (val) => new Add(new Multiply(x.diff(val), y), new Multiply(x, y.diff(val)));
    this.simplify = () => {
        let simple = Op.simplify((a, b) => a * b, Multiply)(x, y);
        let simpleX = x.simplify();
        let simpleY = y.simplify();
        if (isZero(simpleX) || isZero(simpleY)) {
            return new Const(0);
        }
        if (isOne(simpleY)) {
            return simpleX;
        }
        if (isOne(simpleX)) {
            return simpleY;
        }
        return simple;
    }
}


function Divide(x, y) {
    this.evaluate = Op.evaluate((a, b) => a / b)(x, y);
    this.toString = () => Op.toString(x, y) + "/";
    this.diff = (val) => new Divide(new Subtract(
            new Multiply(x.diff(val), y), new Multiply(x, y.diff(val))), new Multiply(y, y));
    this.simplify = () => {
        let simple = Op.simplify((a, b) => a / b, Divide)(x, y);
        let simpleX = x.simplify();
        let simpleY = y.simplify();
        if (isZero(simpleX)) {
            return new Const(0);
        }
        if (isOne(simpleY)) {
            return simpleX;
        }
        return simple;
    }
}

const oper = {
    "+" : Add,
    "-" : Subtract,
    "*" : Multiply,
    "/" : Divide,
    "negate" : Negate,
    "atan" : ArcTan,
    "atan2" : ArcTan2
};

const need = {
    "+" : 2,
    "-" : 2,
    "*" : 2,
    "/" : 2,
    "negate" : 1,
    "atan" : 1,
    "atan2" : 2
};

function parse(source) {
    let stack = [];
    const tokens = source.split(' ').filter(s => s.length > 0).forEach(token => {
        if (token in vars) {
            stack.push(new Variable(token))
        } else if (token in oper) {
            let args = stack.splice(stack.length - need[token], need[token]);
            stack.push(new oper[token](...args))
        } else {
            stack.push(new Const(parseInt(token)))
        }
    });
    return stack.pop()
}


let A = parse('x y z * /').diff('y').simplify().evaluate(1, 2, 3);
console.log(A);