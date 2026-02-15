<?php

namespace SW_WAPF\Includes\Models {

    if (!defined('ABSPATH')) {
        die;
    }

    class ConditionRule
    {

        /**
         * @var string
         */
        public $subject;

        /**
         * @var string
         */
        public $condition;

        /**
         * @var string|string[]|int[]
         */
        public $value;
    }

}