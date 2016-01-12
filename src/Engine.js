"use strict";

/**
 * @flow
 */

const esprima = require('esprima');
//let escodegen = require('escodegen');

const Evaluator = require('./Evaluator');
const Environment = require('./Environment');
const Scope = require('./Scope');
const Value = require('./Value');

function log(what) {
	console.log("LOG", what);
}


/**
 * Container class for all of esper.
 */
class Engine {

	constructor(options) {
		options = options || {};
		this.parser = (code) => esprima.parse(code, {loc: true});
		this.env = new Environment(options);
	}

	/**
	 * Evalute `code` and return a promise for the result.
	 * @access public
	 * @param {string} code - String of code to evaulate
	 * @return {Promise<*>} - The result of execution, as a promise.
	 */
	eval(code) {
		let ast = this.parser(code);
		return this.evalAST(ast);
	}



	evalAST(ast) {
		//console.log(escodegen.generate(ast));
		this.loadAST(ast);
		let value = this.generator.next();
		let steps = 0;
		while ( !value.done ) {
			value = this.generator.next();
			if ( ++steps > 100000 ) throw "Inf loop. detected";
		}
		delete this.generator;
		return Promise.resolve(value.value);
	}


	loadAST(ast) {
		this.evaluator = new Evaluator(this.env, ast, this.globalScope);
		this.generator = this.evaluator.generator();
	}

	load(code) {
		let ast = this.parser(code);
		this.loadAST(ast);
	}

	step() {
		if ( !this.generator ) throw new Error("No code loaded to step");
		let value = this.generator.next();
		return value.done;
	}

	evalASTSync(ast) {
		this.loadAST(ast);
		let value = this.generator.next();
		let steps = 0;
		while ( !value.done ) {
			value = this.generator.next();
			if ( ++steps > 100000 ) throw "Inf loop. detected";
		}
		delete this.generator;
		return value.value;
	}

	/**
	 * @return {Scope}
	 */
	get globalScope() {
		return this.env.globalScope;
	}
}

module.exports = Engine;