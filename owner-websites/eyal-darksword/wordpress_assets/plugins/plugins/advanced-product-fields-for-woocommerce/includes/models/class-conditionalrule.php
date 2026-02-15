<?php

namespace SW_WAPF\Includes\Models {

    if (!defined('ABSPATH')) {
        die;
    }

    class ConditionalRule
    {

        /** @var string */
        public $field;

        /** @var string */
        public $condition;

        /** @var string */
        public $value;

    }
}