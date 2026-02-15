<?php

namespace SW_WAPF\Includes\Classes {

    /**
     * Class Cache
     * @package SW_WAPF\Includes\Classes
     * Simple cache to hold objects during page request. Especially used for Field groups.
     */
    class Cache
    {
        protected static $cache = [];

        public static function set($key, $item) {
            self::$cache[$key] = $item;
        }

        public static function get($key) {

            if(!isset(self::$cache[$key]))
                return false;

            return self::$cache[$key];
        }

        public static function clear() {
            self::$cache = [];
        }

    }
}
