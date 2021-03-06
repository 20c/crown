/**
 * crown - an approach to javascript classes and namespacing 
 * author: Stefan Pratter
 */

(function() {

/**
 * class helper functions
 * @class crown
 * @static
 */

crown = {

  /**
   * converts a string into a standardized class name, replacing
   * invalid characters with valid ones.
   *
   *     crown.make_name("class-a"); // classA
   *     crown.make_name("class a b"); // classAB
   *     crown.make_name("Class-A_B"); // ClassA_B
   *
   * @method make_name
   * @param {String} name base name
   * @returns {String} class_name changed name
   */

  make_name : function(name) {
    var i, names = name.split(/[-\s]/);
    for(i = 0; i < names.length; i++) {
      if(i > 0)
        names[i] = names[i].charAt(0).toUpperCase() + names[i].slice(1);
    }
    return names.join("");
  },

  /**
   * create a new class - if you wish to extend a class take a look at
   * {{#crossLink "cls/extend:method"}}crown.extend{{/crossLink}} 
   * instead
   *
   * you may define a constructor in the definition by using the class
   * name you provide at __name__
   *
   * Note that if the name you provide is not a valid variable name
   * it will be passed through crown.make_name to make it valid
   *
   * ##examples
   *
   * * define and instantiate a class: examples/cls.define.js
   *
   * @method define
   * @param {String} name name or unique identifier of the new class
   * @param {Object} definition object literal of properties and functions that you wish define or redefine
   * @returns {Function} dest constructor of new class
   */
  
  define : function(name, definition) {

    var k;

    name = crown.make_name(name);
    
    if(typeof(definition[name]) == "function") {
      // a constructor has been provided
      var ctor = definition[name]
      delete definition[name]
    } else {
      // no constructor provided, substitute empty constructor
      var ctor = function(){};
    }

    // cycle through definition and copy to class prototype
    for(k in definition) {
      ctor.prototype[k] = definition[k]
    }

    // create meta information
    ctor.prototype._meta = {
      "name" : name
    }

    return ctor

  },
  
  /**
   * fork an existing class with new properties and functions
   *
   * if a function is defined that already exists on the parent class
   * this function will be overwritten and a reference to the original
   * function will be provided at parentClassName_functionName
   *
   * you may define a constructor in the definition by using the class
   * name you provide at __name__
   *
   * Note that if the name you provide is not a valid variable name
   * it will be passed through crown.make_name to make it valid
   *
   * ##examples
   * 
   * * fork and instantiate a class: examples/cls.fork.js
   * * handling method override: examples/cls.fork.method-override.js
   *
   * @method fork
   * @param {String} name name or unqiue identifier of the new class
   * @param {Object} definition object literal of properties and functions that you wish define or redefine
   * @param {Function} [parent] constructor of class 
   * that you wish to fork, if omitted an empty function will be substituted
   * @returns {Function} dest constructor of new class
   */

  fork : function(name, definition, parents) {
    
    var k, i, parent;
    name = crown.make_name(name);
    if(typeof parents == "function")
      var parents = [parents]
    
    if(typeof(definition[name]) == "function") {
      // a constructor has been provided
      var ctor = definition[name]
      delete definition[name]
    } else if(parents.length == 1) {
      // no constructor provided, substitute empty constructor
      var ctor = function(){
        parents[0].apply(this, arguments)
      };
    } else {
      // no constructor provided and forked from multiple sources
      // subsitute empty constructor
      var ctor = function() {};
    }

    // cycle through parent prototype and copy to class prototype
    for(i in parents) {
      parent = parents[i];
      
      if(!parent)
        continue;

      for(k in parent.prototype) {
        ctor.prototype[k] = parent.prototype[k]
        if(typeof(parent.prototype[k]) == "function") {
          ctor.prototype[parent.prototype._meta.name+"_"+k] = parent.prototype[k];
        }
      }

      // cycle through definition and copy to class prototype
      for(k in definition) {
        //if(typeof(ctor.prototype[k]) == "function") {
          // function was already defined by parent, store backref
        //  ctor.prototype[parent.prototype._meta.name+"_"+k] = parent.prototype[k];
        //}
        ctor.prototype[k] = definition[k]
      }
      
      // reference parent constructor
      ctor.prototype[parent.prototype._meta.name] = parent
    }
  
    // create meta information
    ctor.prototype._meta = {
      "name" : name,
      "parents" : parents
    }

    return ctor


  },

  /**
   * overrides a method on the provided class
   *
   * @method override
   * @param {Function} destClass A class created via __crown.define__ or __crown.extend__
   * @param {String} methodName name of method that you wish to override
   * @param {Function} method new method
   */

  override : function(destClass, methodName, method) {
    
    // create reference to old method
    if(destClass.prototype[methodName])
      destClass.prototype[destClass.prototype._meta.name+"_"+methodName] = destClass.prototype[methodName];
    
    // override
    destClass.prototype[methodName] = method;

  }

}

/**
 * util functions
 * @namespace crown
 * @class util
 * @static
 */

crown.util = {

  /**
   * concat multiple arrays into one array
   * @method concat_array
   */
  
  concat_array : function() {
    var rv = [], a, i, k;
    for(k=0; k<arguments.length; k++) {
      a = arguments[k];
      if(a === undefined)
        continue;
      if(typeof a == "object" && a.length) {
        for(i = 0; i < a.length; i++) {
          rv.push(a[i]);
        }
      } else
        rv.push(a);
    }
    return rv;
  }
}

/**
 * define a new class - convenience wrapper for class definition 
 * @namespace crown
 * @function define_or_fork
 * @param {String} name name of the new class
 * @param {Object} definition object literal of methods ands attributes
 * @param {Function} source fork new class from source class inheriting all of source class's attributes and methods
 * @returns {Function} constructor for new class
 */

crown.define_or_fork = function(name, definition, source) {
  if(!name || !definition)
    return function(){};
  if(!source)
    return crown.define(name, definition);
  else
    return crown.fork(name, definition, source);
}

/**
 * initialize a new space
 * @namespace crown
 * @function space 
 * @returns crown object
 */

crown.space = function(name, definition, space, source, containerSource) {
  rv = {
    "$meta" : {
      "cls" : crown.define_or_fork(name, definition, source),
      "space" : space,
      "name" : name,
      "definition" : definition
    },
    "$init" : function() {
      function F(cls, args) { return cls.apply(this, args);}
      F.prototype = this.$meta.cls.prototype;
      return new F(this.$meta.cls, arguments);
    },
    "$define" : function(name, definition, source) {
      var containerSource = []
      if(typeof source == "object" && source.length) {
        var i;
        for(i = 0; i < source.length; i++) {
          if(source[i] && source[i].$meta) {
            containerSource.push(source[i]);
          }
          source[i] = (source[i] && source[i].$meta ? source[i].$meta.cls : source[i])
        }
      } else if(source && source.$meta) {
        containerSource.push(source);
        source = [source.$meta.cls];
      }

      this[name] = crown.space(name, definition, this, source, containerSource);
    },
    "$fork" : function(name, definition, sources, space) {
      (space || this.$meta.space).$define(name, definition, crown.util.concat_array(this, sources));
    },
    "$extend" : function(definition) {
      var i;
      for(i in definition) {
        crown.override(this.$meta.cls, i, definition[i]);
      }
    }
  }

  var i, j, cls = rv.$meta.cls;
  var isCoreFunction = function(name) {
    return (
      name == '$meta' ||
      name == '$define' ||
      name == '$fork' ||
      name == '$extend' ||
      name == '$init'
    )
  }
  
  if(containerSource && containerSource.length > 0) {
    for(i in containerSource) {
      for(j in containerSource[i]) {
        if(j.charAt(0) == "$" && !isCoreFunction(j)) {
          if(typeof containerSource[i][j] == "function") {
            rv.$meta.cls.prototype[j] = containerSource[i][j].bind(rv);
            rv[j] = containerSource[i][j]
          } else {
            rv.$meta.cls.prototype[j] = rv[j] = containerSource[i][j];
          }
        }
      }
    }
  }

  for(i in definition) {
    if(i.charAt(0) == "$") {
      if(rv[i] && source) {
        rv[source.prototype._meta.name+"_"+i] = source[i];
      }
      rv[i] = definition[i];

      // rebind class methods
      if(cls && cls.prototype[i].bind) {
        cls.prototype[i] = cls.prototype[i].bind(rv);
      }
    }
  }
  if(cls && cls.prototype._meta)
    cls.prototype._meta.crown = rv;

  return rv;
}


})();
