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

Operation = {toString : function () {
        let s = ""
        for (i of arguments) {
            s += i;
        }
        return s;
    }, evaluate : function(...args) {
    
    }
};

const Const = function(x) {
    this.evaluate = () => x;
    this.toString = () => Operation.toString(x);
    this.diff = () => new Const(0);
    this.simplify = () => this
};

const Variable = function(x) {
    this.evaluate = (...args) => args[vars[x]]
    this.diff = (val) => new Const(val === x ? 1 : 0);
    this.toString = () => Operation.toString(x);
    this.simplify = () => this
}

function Negate(x) {
    this.evaluate = (...args) => -x.evaluate(...args);
    this.diff = (val) => new Negate(x.diff(val));
    this.toString = () => Operation.toString(x, " negate");
    this.simplify = () => {
        let new_x = x.simplify();
        if (isConst(new_x)) {
            return new Const(-new_x);
        }
        return new Negate(new_x);
    }
}

function ArcTan(x) {
    this.evaluate = (...args) => Math.atan(x.evaluate(...args));
    this.diff = (val) => new Divide(x.diff(val), new Add(new Const(1), new Multiply(x, x)));
    this.toString = () => Operation.toString(x, " atan");
    this.simplify = () => {
        let new_x = x.simplify();
        if (isConst(new_x)) {
            return new Const(Math.atan(new_x));
        }
        return new ArcTan(new_x);
    }
}

function Add(x, y) {
    this.evaluate = (...args) => x.evaluate(...args) + y.evaluate(...args);
    this.diff = (val) => new Add(x.diff(val), y.diff(val))
    this.toString = () => Operation.toString(x, " ", y, " +")
    this.simplify = () => {
        let new_x = x.simplify();
        let new_y = y.simplify();
        if (isZero(new_x)) {
            return new_y;
        }
        if (isZero(new_y)) {
            return new_x;
        }
        if (isConst(new_x) && isConst(new_y)) {
            return new Const(new_x + new_y);
        }
        return new Add(new_x, new_y);
    }
}

function ArcTan2(x, y) {
    this.evaluate = (...args) => Math.atan2(x.evaluate(...args), y.evaluate(...args));
    this.diff = (val) => new Divide(new Subtract(new Multiply(x.diff(val), y), new Multiply(x, y.diff(val))),
        new Add(new Multiply(x, x), new Multiply(y, y)))
    this.toString = () => Operation.toString(x, " ", y, " atan2")
    this.simplify = () => {
        let new_x = x.simplify();
        let new_y = y.simplify();
        if (isConst(new_x) && isConst(new_y)) {
            return Math.atan2(new_x, new_y);
        }
        return new ArcTan2(new_x, new_y);
    }
}

function Subtract(x, y) {
    this.evaluate = (...args) => x.evaluate(...args) - y.evaluate(...args);
    this.diff = (val) => new Subtract(x.diff(val), y.diff(val))
    this.toString = () => Operation.toString(x, " ", y, " -")
    this.simplify = function() {
        let new_x = x.simplify();
        let new_y = y.simplify();
        if (isZero(new_x)) {
            return new Negate(new_y).simplify();
        }
        if (isZero(new_y)) {
            return new_x;
        }
        if (isConst(new_x) && isConst(new_y)) {
            return new Const(new_x - new_y)
        }
        return new Subtract(new_x, new_y);
    }
}

function Multiply(x, y) {
    this.evaluate = (...args) => x.evaluate(...args) * y.evaluate(...args);
    this.toString = () => Operation.toString(x, " ", y, " *")
    this.diff = (val) => new Add(new Multiply(x.diff(val), y), new Multiply(y.diff(val), x));
    this.simplify = function () {
        let new_x = x.simplify();
        let new_y = y.simplify();
        if (isZero(new_x) || isZero(new_y)) {
            return new Const(0);
        }
        if (isOne(new_y)) {
            return new_x;
        }
        if (isOne(new_x)) {
            return new_y;
        }
        if (isConst(new_x) && isConst(new_y)) {
            return new Const(new_x * new_y);
        }
        return new Multiply(new_x, new_y);
    }
}

function Divide(x, y) {
    this.evaluate = (...args) => x.evaluate(...args) / y.evaluate(...args);
    this.toString = () => Operation.toString(x, " ", y, " /")
    this.diff = (val) => new Divide(new Subtract(
            new Multiply(x.diff(val), y), new Multiply(x, y.diff(val))), new Multiply(y, y));
    this.simplify = function () {
        console.log(x)
        let new_x = x.simplify();
        let new_y = y.simplify();
        if (isZero(new_x)) {
            return new Const(0);
        }
        if (isOne(new_y)) {
            return new_x;
        }
        if (isConst(new_x) && isConst(new_y)) {
            return new Const(new_x / new_y);
        }
        return new Divide(new_x, new_y);
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
    //"min3" : Min3,
    //"max5" : Max5,
    //"avg5" : avg5,
    //"med3" : med3

};

const need = {
    "+" : 2,
    "-" : 2,
    "*" : 2,
    "/" : 2,
    "negate" : 1,
    "atan" : 1,
    "atan2" : 2
    //"min3" : 3,
    //"max5" : 5,
    //"avg5" : 5,
    //"med3" : 3

};

function parse(source) {
    const tokens = source.split(' ').filter(s => s.length > 0);
    let stack = [];
    for (let i of tokens) {
        if (i in vars) {
            stack.push(new Variable(i))
        } else if (i in oper) {
            let args = [];
            for (let j = 0; j < need[i]; j++) {
                args.push(stack.pop())
            }
            args.reverse();
            stack.push(new oper[i](...args))
        } else {
            stack.push(new Const(parseInt(i)))
        }
    }
    return stack.pop()
}


let A = new ArcTan2(new Add(new Variable('x'), new Variable('y')), new Variable('z')).diff('x')
console.log(A)