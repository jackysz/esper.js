"use strict";
/* @flow */

const Value = require('../Value');

/**
 * Represents a value that maps directly to an untrusted local value.
 */
class BridgeValue extends Value {
	
	constructor(value) {
		super();
		this.native = value;
	}

	ref(name) {
		let out = Object.create(null);
		Object.defineProperty(out, 'value', {
			get: () => this.fromNative(this.native[name]),
			set: (value) => this.native[name] = value.toNative()
		});
		return out;
	}

	assign(name, value) {
		this.native[name] = value.toNative();
	}

	toNative() {
		return this.native;
	}

	*doubleEquals(other) { return this.fromNative(this.native == other.toNative()); }
	*tripleEquals(other) { return this.fromNative(this.native === other.toNative()); }

	*add(other) { return this.fromNative(this.native + other.toNative()); }
	*subtract(other) { return this.fromNative(this.native - other.toNative()); }
	*multiply(other) { return this.fromNative(this.native * other.toNative()); }
	*divide(other) { return this.fromNative(this.native / other.toNative()); }
	*mod(other) { return this.fromNative(this.native % other.toNative()); }

	*shiftLeft(other) { return this.fromNative(this.native << other.toNative()); }
	*shiftRight(other) { return this.fromNative(this.native >> other.toNative()); }
	*shiftRightZF(other) { return this.fromNative(this.native >>> other.toNative()); }

	*bitAnd(other) { return this.fromNative(this.native & other.toNative()); }
	*bitOr(other) { return this.fromNative(this.native | other.toNative()); }
	*bitXor(other) { return this.fromNative(this.native ^ other.toNative()); }

	*gt(other) { return this.fromNative(this.native > other.toNative()); }
	*lt(other) { return this.fromNative(this.native < other.toNative()); }
	*gte(other) { return this.fromNative(this.native >= other.toNative()); }
	*lte(other) { return this.fromNative(this.native <= other.toNative()); }

	*inOperator(other) { return this.fromNative(this.native in other.toNative()); }
	*instanceOf(other) { return this.fromNative(this.native instanceof other.toNative()); }
	
	*unaryPlus() { return this.fromNative(+this.native); }
	*unaryMinus() { return this.fromNative(-this.native); }
	*not() { return this.fromNative(!this.native); }



	*member(name) { 
		return this.fromNative(this.native[name]); 
	}



	/**
	 *
	 * @param {Evaluator} evaluator
	 * @param {Value} thiz
	 * @param {Value[]} args
	 */
	*call(evaluator, thiz, args) {
		let realArgs = new Array(args.length);
		for ( let i = 0; i < args.length; ++i ) {
			realArgs[i] = args[i].toNative();
		}
		let result = this.native.apply(thiz ? thiz.toNative() : undefined, realArgs);
		return this.fromNative(result);

	}

	*makeThisForNew() {
		return this.fromNative(Object.create(this.native.prototype));
	}

	get truthy() {
		return !!this.native;
	}

	get jsTypeName() {
		return typeof this.native;
	}
}

module.exports = BridgeValue;