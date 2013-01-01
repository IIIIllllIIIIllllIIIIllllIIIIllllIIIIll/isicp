/*
This file implements the core Scheme interpreter functions, including the
eval/apply mutual recurrence, environment model, and read-eval-print loop
*/

function read(form) {
    var lines = form.readarea.value.split('\n');
    var codebuffer = new Buffer(tokenize_lines(lines));
    var env = create_global_frame();
    // create global variable for functions such as display and print to use
    // (I hate doing this but it's the only solution I can think of now)
    form_out = form;
    form.writearea.value = '';
    while (codebuffer.current() != null) {
	try {
	    var result = scheme_eval(scheme_read(codebuffer), env);
	    if (! (result === null || result === undefined)) {
		form.writearea.value += result.toString() + "\n";
	    }
	} catch(e) {
	    console.log(e);
	    break;
	}
    }
}

/////////////////////
// Data Structures //
/////////////////////

function Frame(parent) {
    this.bindings = {};
    this.parent = parent;
}
Frame.prototype = {
    lookup : function(symbol) {
	// Return the value bound to SYMBOL.  Errors if SYMBOL is not found
	if (symbol in this.bindings) {
	    return this.bindings[symbol];
	} else if (this.parent !== null) {
	    return this.parent.lookup(symbol);
	} else {
	    throw "SchemeError: unknown identifier: " + symbol.toString();
	}
    },
    global_frame : function() {
	// The global environment at the root of the parent chain
	var e = this;
	while (e.parent !== null) {
	    e = e.parent;
	}
	return e;
    },
    make_call_frame : function(formals, vals) {
	// Return a new local frame whose parent is SELF, in which the symbols
        // in the Scheme formal parameter list FORMALS are bound to the Scheme
        // values in the Scheme value list VALS
	var frame = new Frame(this);
	var formals = pair_to_array(formals);
	var vals = pair_to_array(vals);
	if (formals.length != vals.length) {
	    throw "SchemeError: Invalid number of arguments";
	}
	for (var i = 0; i < formals.length; i++) {
	    frame.bindings[formals[i]] = vals[i];
	}
	return frame;
    },
    define : function(sym , val) {
	// Define Scheme symbol SYM to have value VAL in SELF
	this.bindings[sym] = val;
    }
}

// A procedure defined by a lambda expression or the complex define form
function LambdaProcedure(formals, body, env) {
    // A procedure whose formal parameter list is FORMALS (a Scheme list),
    // whose body is the single Scheme expression BODY, and whose parent
    // environment is the Frame ENV.  A lambda expression containing multiple
    // expressions, such as (lambda (x) (display x) (+ x 1)) can be handled by
    // using (begin (display x) (+ x 1)) as the body
    this.formals = formals;
    this.body = body;
    this.env = env;
}

LambdaProcedure.prototype = {
    toString : function() {
	return "(lambda "+ this.formals.toString() +" "+ 
	       this.body.toString() +")" ;
    }
}

/////////////////////
// Eval-Apply Loop //
/////////////////////

function scheme_eval(expr, env) {
    // Evaluate Scheme expression EXPR in environment ENV
    // This version of scheme_eval supports tail-call optimization
    while (true) {
        if (expr === null) {
            throw 'SchemeError: Cannot evaluate an undefined expression.';
        }
	// Evaluate Atoms
        if (scheme_symbolp(expr)) {
            return env.lookup(expr);
        } else if (scheme_atomp(expr)) {
            return expr;
        }
        if (! scheme_listp(expr)) {
            throw "SchemeError: malformed list: " + expr.toString();
        }
        var first = expr.first;
        var rest = expr.second;

        if (first in LOGIC_FORMS) {
            expr = LOGIC_FORMS[first](rest, env);
        } else if (first === 'lambda') {
            return do_lambda_form(rest, env);
        } else if (first === 'mu') {
            return do_mu_form(rest);
	} else if (first === 'define') {
            return do_define_form(rest, env);
        } else if (first === 'quote') {
            return do_quote_form(rest);
        } else if (first === 'let') {
            var l = do_let_form(rest, env);
            expr = l[0];
            env = l[1];
        } else {
            var procedure = scheme_eval(first, env);
	    var args = rest.map(function(operand) 
				{return scheme_eval(operand, env);});
            if (procedure instanceof LambdaProcedure) {
                env = procedure.env.make_call_frame(procedure.formals, args);
                expr = procedure.body;
	    } else {
                return scheme_apply(procedure, args, env);
            }
        }
    }
}

function scheme_apply(procedure, args, env) {
    // Apply Scheme PROCEDURE to argument values ARGS in environment ENV
    if (procedure instanceof PrimitiveProcedure) {
        return apply_primitive(procedure, args, env);
    } else if (procedure instanceof LambdaProcedure) {
        var call_frame = procedure.env.make_call_frame(procedure.formals, args);
        return scheme_eval(procedure.body, call_frame);
    } else {
        throw "SchemeError: Cannot call" + procedure.toString();
    }
}

function apply_primitive(procedure, args, env) {
    // Apply PrimitiveProcedure PROCEDURE to a Scheme list of ARGS in ENV
    args = pair_to_array(args);
    if (procedure.use_env) {
        args.concat(env);
    }
    try {
        return procedure.fn.apply(this, args);
    } catch(e) {
        throw "SchemeError: Invalid number of arguments"
    }
}

function pair_to_array(list) {
    if (list === nil) {
        return [];
    }
    return [list.first].concat(pair_to_array(list.second));
}


///////////////////
// Special Forms //
///////////////////

function do_lambda_form(vals, env) {
    // Evaluate a lambda form with parameters VALS in environment ENV
    var value, formals
    check_form(vals, 2);
    formals = vals.getitem(0);
    check_formals(formals);
    if (vals.length() == 2) {
        value = vals.getitem(1);
    } else {
        value = new Pair('begin', vals.second);
    }
    return new LambdaProcedure(formals, value, env);
}

function do_define_form(vals, env) {
    // Evaluate a define form with parameters VALS in environment ENV
    var target, value, t, v
    check_form(vals, 2);
    target = vals.getitem(0);
    if (scheme_symbolp(target)) {
        check_form(vals, 2, 2);
        value = scheme_eval(vals.getitem(1), env);
        env.define(target, value);
    } else if (target instanceof Pair) {
        t = target.getitem(0);
        if (! scheme_symbolp(t)) {
            throw "SchemeError: not a variable: " + t.toString();
        }
        v = new Pair(vals.first.second, vals.second);
        value = do_lambda_form(v, env);
        env.define(t, value);
    } else {
        throw "SchemeError: bad argument to define"
    }
}

function do_quote_form(vals) {
    // Evaluate a quote form with parameters VALS
    check_form(vals, 1, 1);
    return vals.getitem(0);
}

function do_let_form(vals, env) {
    // Evaluate a let form with parameters VALS in environment ENV
    check_form(vals, 2);
    var bindings = vals.getitem(0);
    var exprs = vals.second;
    if (! scheme_listp(bindings)) {
        throw "SchemeError: bad bindings list in let form";
    }
    // Add a frame containing bindings
    var names = nil
    vals = nil
    var new_env = env.make_call_frame(names, vals);
    for (var i = 0; i < bindings.length(); i++) {
	var binding = bindings.getitem(i);
        check_form(binding, 2, 2);
        if (! scheme_symbolp(binding.getitem(0))) {
            throw "SchemeError: bad binding: " + binding.toString();
        }
        var name = binding.getitem(0);
        var value = scheme_eval(binding.getitem(1), env);
        new_env.define(name, value);
    } 
    // Evaluate all but the last expression after bindings, and return the last
    var last = exprs.length() - 1;
    for (i = 0; i < last; i++) {
        scheme_eval(exprs.getitem(i), new_env);
    }
    return [exprs.getitem(last), new_env];
}

/////////////////
// Logic Forms //
/////////////////

function do_if_form(vals, env) {
    // Evaluate if form with parameters VALS in environment ENV
    check_form(vals, 3, 3);
    var pred = scheme_eval(vals.getitem(0), env);
    var cons = vals.getitem(1);
    var alt = vals.getitem(2);
    if (scheme_true(pred)) {
	return cons;
    } else {
	return alt;
    }
}

function do_and_form(vals, env) {
    // Evaluate short-circuited and with parameters VALS in environment ENV
    if (vals.length() == 0) {return true;}
    for (var i = 0; i < vals.length(); i++) {
	var pred = scheme_eval(vals.getitem(i), env);
	if (scheme_false(pred)) {return false;}
    }
    return pred;
}

function do_or_form(vals, env) {
    // Evaluate short-circuited or with parameters VALS in environment ENV
    for (var i = 0; i < vals.length(); i++) {
	var pred = scheme_eval(vals.getitem(i), env);
	if (scheme_true(pred)) {return pred;}
    }
    return false;
}

function do_cond_form(vals, env) {
    // Evaluate cond form with parameters VALS in environment ENV
    var num_clauses = vals.length();
    for (var i = 0; i < vals.length(); i++) {
	var clause = vals.getitem(i);
	check_form(clause, 1);
	if (clause.first === "else") {
	    if (i < num_clauses - 1) {
		throw "SchemeError: else must be last";
	    }
	    var test = true;
	    if (clause.second === nil) {
		throw "SchemeError: badly formed else clause";
	    }
	} else {
	    test = scheme_eval(clause.first, env);
	}
	if (scheme_true(test)) {
	    if (clause.second.length() == 0) {return test;}
	    return new Pair('begin', clause.second);
	}
    }
    return null;
}
function do_begin_form(vals, env) {
    // Evaluate begin form with parameters VALS in environment ENV
    check_form(vals, 1);
    var eval_length = vals.length() - 1;
    for (var l = 0; l < eval_length; l++) {
	scheme_eval(vals.getitem(l), env);
    }
    return vals.getitem(eval_length);
}

LOGIC_FORMS = {
        "and": do_and_form,
        "or": do_or_form,
        "if": do_if_form,
        "cond": do_cond_form,
        "begin": do_begin_form,
        };

//////////////////////
// Helper Functions //
//////////////////////

function create_global_frame() {
    // Initialize and return a single-frame environment with built-in names
    var env = new Frame(null);
    env.define("eval", new PrimitiveProcedure(scheme_eval, true));
    env.define("apply", new PrimitiveProcedure(scheme_apply, true));
    add_primitives(env);
    return env;
}

function add_primitives(frame) {
    for (var name in _PRIMITIVES) {
	frame.define(name, _PRIMITIVES[name]);
    }
}

// Utility methods for checking the structure of Scheme programs

function check_form(expr, min, max) {
    // Check EXPR (default SELF.expr) is a proper list whose length is
    // at least MIN and no more than MAX (default: no maximum). Raises
    // a SchemeError if this is not the case
    if (! scheme_listp(expr)) {
	throw "SchemeError: badly formed expression: " + expr.toString();
    }
    var length = expr.length();
    if (length < min) {
	throw "SchemeError: too few operands in form";
    } else if ( (! (max === undefined)) && (length > max) ) {
	throw "SchemeError: too many operands in form";
    }
}

function check_formals(formals) {
    // Check that FORMALS is a valid parameter list, a Scheme list of symbols
    // in which each symbol is distinct
    check_form(formals, 0);
    var symbols = [];
    for (var i = 0; i < formals.length(); i++) {
	var symbol = formals.getitem(i);
	if (! scheme_symbolp(symbol)) {
	    throw "SchemeError: not a symbol: " + symbol.toString();
	}
	if (symbols.inside(symbol)) {
	    throw "SchemeError: repeated symbol in formal parameters: "
	          + symbol;
	} else {
	    symbols.push(symbol);
	}
    }
}
    
