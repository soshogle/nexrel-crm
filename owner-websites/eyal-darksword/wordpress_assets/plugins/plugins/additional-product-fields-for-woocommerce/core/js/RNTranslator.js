function _rnt(key) {
    if(typeof RNTranslatorDictionary=='undefined'|| RNTranslatorDictionary[key]==null)
        return key;
    return RNTranslatorDictionary[key];
}
function _rntt(key) {
    return _rnt(key);
}

