<?php

namespace SW_WAPF\Includes\Classes {

    use Exception;
    use ArrayIterator;

    class Enumerable
    {
        private $iterator;

        private function __construct (ArrayIterator $iterator)
        {
            $this->iterator = $iterator;
            // Set iterator back to the 1st element.
            $this->iterator->rewind();
        }

        /**
         * @param $source
         * @return Enumerable|null
         */
        public static function from ($source)
        {
            // Only ArrayIterator possible atm.
            $iterator = null;

            if ($source instanceof Enumerable)
                return $source;
            if (is_array($source))
                $iterator = new ArrayIterator($source);

            if ($iterator !== null)
            {
                return new Enumerable($iterator);
            }

            // No array, return empty array.
            return new Enumerable(new ArrayIterator([]));
        }

        #region Query functions

        /**
         * @param $predicate
         *
         * @return Enumerable
         */
        public function select($predicate)
        {
            // Back to 1st.
            $this->iterator->rewind();

            $objects = [];

            while ($this->iterator->valid())
            {
                array_push($objects,$predicate($this->iterator->current(), $this->iterator->key()));
                $this->iterator->next();
            }
            return self::from($objects);
        }

        /**
         * @param $predicate string | \Closure
         * @return Enumerable
         */
        public function where ($predicate)
        {
            // Back to 1st.
            $this->iterator->rewind();

            // while items
            $keys = [];
            while ($this->iterator->valid())
            {
                // Remove from iterator when predicate not true.
                if(!$predicate($this->iterator->current(), $this->iterator->key()))
                    array_push($keys, $this->iterator->key());
                $this->iterator->next();
            }

            foreach($keys as $key){
                $this->iterator->offsetUnset($key);
            }

            return $this;
        }

        /**
         * @param $predicate string|\Closure
         *
         * @return object|array|null
         */
        public function firstOrDefault($predicate)
        {

            $this->iterator->rewind();
            if(!$this->iterator->valid()) return null;

            // while items
            while ($this->iterator->valid())
            {
                // Push onto result if predicate returns true.
                if($predicate($this->iterator->current(), $this->iterator->key()))
                    return $this->iterator->current();
                $this->iterator->next();
            }

            return null;
        }

        public function orderByDesc($predicate){

            $comparer = function($a,$b)use($predicate){
                if($predicate($a) === $predicate($b) )
                    return 0;
                return ($predicate($a) < $predicate($b)) ? 1 : -1;
            };

            $this->iterator->uasort($comparer);
            return $this;
        }

        public function orderBy($predicate) {

            $comparer = function($a,$b)use($predicate){
                if($predicate($a) === $predicate($b) )
                    return 0;
                return ($predicate($a) < $predicate($b)) ? -1 : 1;
            };

            $this->iterator->uasort($comparer);
            return $this;
        }

        #endregion

        #region Boolean Functions
        public function any($predicate = null)
        {
            if($predicate === null)
                return iterator_count($this->iterator) > 0;

            return $this->firstOrDefault($predicate) != null;
        }

        #endregion

        #region Integer Functions
        public function count($predicate = null)
        {
            if($predicate === null)
                return iterator_count($this->iterator);
            return iterator_count($this->where($predicate)->iterator);
        }
        #endregion

        #region String Functions

        /**
         * Joins an array of objects by generating a string of values with separators.
         * @return string
         */
        public function join($value_predicate, $separator)
        {
            $this->iterator->rewind();

            $result = [];
            while ($this->iterator->valid())
            {
                // Push onto result if predicate returns true.
                array_push($result, $value_predicate($this->iterator->current(),$this->iterator->key()));
                $this->iterator->next();
            }

            return join($separator, $result);
        }

        #endregion

        #region Operations
        /**
         * Turn a list of lists into a list. Only goes 2 levels deep at this point.
         */
        public function flatten()
        {
            $flat = [];

            $this->iterator->rewind();
            while ($this->iterator->valid())
            {
                if(is_array($this->iterator->current())){
                    foreach($this->iterator->current() as $e){
                        array_push($flat,$e);
                    }
                }
                $this->iterator->next();
            }

            return self::from($flat);
        }



        public function merge($predicate) {

            $merged = [];

            $this->iterator->rewind();
            while ($this->iterator->valid())
            {
                $value = $predicate($this->iterator->current(),$this->iterator->key());
                $merged = array_merge($merged, is_array($value) ? $value : [$value]);
                $this->iterator->next();
            }

            return self::from($merged);

        }
        #endregion

        #region Conversion Functions
        /**
         * @return array
         */
        public function toArray()
        {
            $this->iterator->rewind();

            if ($this->iterator instanceof ArrayIterator)
                return $this->iterator->getArrayCopy();

            $result = [];
            foreach ($this->iterator as $k => $v) {
                $result[ $k ] = $v;
            }
            return $result;
        }
        #endregion

    }
}