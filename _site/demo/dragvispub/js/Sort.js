/*
 From:
 http://dl.dropboxusercontent.com/u/19698383/Blog/JavaScriptAlgorithmsDataStructs/Scripts/Algorithms.js
 */

var sortAlgos = {};
/*
 Utility functions
 */
sortAlgos.swap = function(_array, i, j) {
  var tmp = _array[i];
  _array[i] = _array[j];
  _array[j] = tmp;
};
sortAlgos.merge = function(left, right, _array, res){
  var a=0;
  while(left.length && right.length){
    _array[a++] = right[0] < left[0] ? right.shift() : left.shift();
    res.push(_array.slice());
  }
  while(left.length){
    _array[a++] = left.shift();
    res.push(_array.slice());
  }
  while(right.length){
    _array[a++] = right.shift();
    res.push(_array.slice());
  }
};
sortAlgos.partition = function(_array, begin, end, pivot, res){
  var piv=_array[pivot];
  sortAlgos.swap(_array,pivot, end-1);
  res.push(_array.slice());
  var store=begin;
  var ix;
  for(ix=begin; ix<end-1; ++ix) {
    if(_array[ix]<=piv) {
      sortAlgos.swap(_array,store, ix);
      ++store;
    }
    res.push(_array.slice());
  }
  sortAlgos.swap(_array,end-1, store);
  res.push(_array.slice());
  return store;
};
sortAlgos.isSorted = function(_array){
  for(var i=1; i<_array.length; i++) {
    if (_array[i-1] > _array[i]) { return false; }
  }
  return true;
};
sortAlgos.shuffle = function(_array) {
  for(var j, x, i = _array.length; i; j = Math.floor(Math.random() * i), x = _array[--i], _array[i] = _array[j], _array[j] = x);
  return _array;
};


/*
 SELECTION SORT
 */
sortAlgos.selectionSort = function(_array, res){
  var i, j, tmp, tmp2;
  for (i = 0; i < _array.length - 1; i++){
    tmp = i;
    for (j = i + 1; j < _array.length; j++){
      if (_array[j] < _array[tmp]) tmp = j;
      res.push(_array.slice());
    }
    sortAlgos.swap(_array,i,tmp);
    res.push(_array.slice());
  }
};

/*
 QUICK SORT
 */
sortAlgos.quickSort = function(_array, begin, end, res){
  if(end-1>begin) {
    var pivot = begin+Math.floor(Math.random()*(end-begin));
    pivot = sortAlgos.partition(_array, begin, end, pivot, res);
    sortAlgos.quickSort(_array, begin, pivot, res);
    sortAlgos.quickSort(_array, pivot+1, end, res);
  }
};

/*
 INSERTION SORT
 */
sortAlgos.insertionSort = function(_array, res) {
  for (var i = 0, j, tmp; i < _array.length; ++i) {
    tmp = _array[i];
    for (j = i - 1; j >= 0 && _array[j] > tmp; --j){
      _array[j + 1] = _array[j];
      res.push(_array.slice());
    }
    _array[j + 1] = tmp;
    res.push(_array.slice());
  }
};

/*
 GNOME SORT
 */
sortAlgos.gnomeSort = function(_array, res) {
  var i= 0, tmp;
  while (i < _array.length) {
    if (i==0||_array[i-1] <= _array[i]) {
      i++;
    } else {
      tmp=_array[i];
      _array[i]=_array[i-1];
      _array[--i]=tmp;
    }
    res.push(_array.slice());
  }
};

/*
 BUBBLE SORT
 */
sortAlgos.bubbleSort = function(_array, res) {
  var i, j;
  var swapped = false;
  for(i=1; i<_array.length; i++) {
    for(j=0; j<_array.length - i; j++) {
      if (_array[j+1] < _array[j]) {
        sortAlgos.swap(_array, j, j+1);
        swapped = true;
      }
      res.push(_array.slice());
    }
    if (!swapped) break;
  }
};


/*
 MERGE SORT
 */
sortAlgos.mSort = function(_array,tmp,length, res){
  if(length==1)return;
  var m = Math.floor(length/2),
      tmp_l = tmp.slice(0,m),
      tmp_r = tmp.slice(m);
  sortAlgos.mSort(tmp_l,_array.slice(0,m),m, res);
  sortAlgos.mSort(tmp_r,_array.slice(m),length-m, res);
  sortAlgos.merge(tmp_l,tmp_r,_array, res);
};
sortAlgos.mergeSort = function(_array, res){
  sortAlgos.mSort(_array,_array.slice(),_array.length, res);
};

/*
 BOGO SORT
 */
sortAlgos.bogoSort = function(_array, res){
  var sorted = false;
  while(sorted == false){
    _array = sortAlgos.shuffle(_array);
    res.push(_array.slice());
    sorted = sortAlgos.isSorted(_array);
  }
};

/*
 COUNT SORT
 */
sortAlgos.countSort = function(_array, min, max, res) {
  var i, z = 0, count = [];
  for (i = min; i <= max; i++) {
    count[i] = 0;
    res.push(_array.slice());
  }
  for (i=0; i < _array.length; i++) {
    count[_array[i]]++;
    res.push(_array.slice());
  }
  for (i = min; i <= max; i++) {
    while (count[i]-- > 0) {
      _array[z++] = i;
      res.push(_array.slice());
    }
  }
};

/*
 SHELL SORT
 */
sortAlgos.shellSort = function(_array, res) {
  for (var h = _array.length; h = parseInt(h / 2);) {
    for (var i = h; i < _array.length; i++) {
      var k = _array[i];
      for (var j = i; j >= h && k < _array[j - h]; j -= h){
        _array[j] = _array[j - h];
        res.push(_array.slice());
      }
      _array[j] = k;
      res.push(_array.slice());
    }
  }
};