const Simple = {
    simplify : function() {return this;}
};

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

Const.prototype = Object.create(Simple);
Const.prototype.evaluate = function () { return this.val; };
Const.prototype.toString = function () { return this.val.toString(); };
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
Variable.prototype = Object.create(Simple);
Variable.prototype.evaluate = function (...args) {  return args[this.id]; };
Variable.prototype.toString = function () { return this.name; };
Variable.prototype.diff = function (val) { return (val === this.name ? ONE : ZERO); };

let Operation = function(){};
Operation.prototype.evaluate = function (...args) { return this.getOperation(...this.getArgs.map(arg => arg.evaluate(...args)))};
Operation.prototype.toString = function () { return this.getArgs.join(" ") + " " + this.getSymbol; };
Operation.prototype.diff = function (name) { return this.getDiff(...this.getArgs, ...this.getArgs.map(arg => arg.diff(name))); };
Operation.prototype.simplify = function () {
    let simpleArgs = this.getArgs.map(arg => arg.simplify());
    let onlyConst = 1;
    simpleArgs.forEach(token => {if (!isConst(token)) {onlyConst = 0;}});
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
const Negate = generator("negate", function(a) {return -a}, function(a, da) {return new Negate(da)});

const ArcTan = generator("atan", function(a) {return Math.atan(a)},function(a, da) {return new Divide(da, new Add(new Const(1), new Multiply(a, a)))});

const Add = generator("+", function(a, b) {return a + b}, function(a, b, da, db) {return new Add(da, db)},
    function(a, b){
    if (isZero(a)) {
        return b;
    }
    if (isZero(b)) {
        return a;
    }
    return new Add(a, b);
});

const Subtract = generator("-", function(a, b) {return a - b},function(a, b, da, db) {return new Subtract(da, db)},
    function(a, b) {
    if (isZero(b)) {
        return a;
    }
    if (isZero(a)) {
        return new Negate(b);
    }
    return new Subtract(a, b);
});

const ArcTan2 = generator("atan2",function(a, b) {return Math.atan2(a, b)},
    function(a, b, da, db) {return new Divide(new Subtract(new Multiply(da, b), new Multiply(db, a)), new Add(new Multiply(a, a), new Multiply(b, b)))},
    function(a, b){
        if (isZero(a) && !isZero(b)) {
            return new Const(0);
        }
        if (isOne(b)) {
            return new ArcTan(a);
        }
        return new ArcTan2(a, b);
    });

const Multiply = generator("*", function(a, b) {return a * b}, function(a, b, da, db) {return new Add(new Multiply(a, db), new Multiply(da, b))},
    function(a, b) {
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

const Divide = generator("/", function(a, b) {return a / b},function(a, b, da, db) {return new Divide(new Subtract(new Multiply(da, b), new Multiply(db, a)), new Multiply(b, b))},
    function(a, b) {
        if (isZero(a)) {
            return new Const(0);
        }
        if (isOne(b)) {
            return a;
        }
        return new Divide(a, b);
    });


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

const VARIABLE = {};
for (let v in vars) {
    VARIABLE[v] = new Variable(v);
}

const parse = source => {
    let stack = [];
    source.split(' ').filter(s => s.length > 0).forEach(token => {
        if (token in oper) {
            let args = stack.splice(-need[token]);
            stack.push(new oper[token](...args))
        } else if (token in vars) {
            stack.push(VARIABLE[token]);
        } else {
            stack.push(new Const(Number(token)));
        }
    });
    return stack.pop()
};



let A = new Add(new Variable('x'), new Const(2));
console.log(A);