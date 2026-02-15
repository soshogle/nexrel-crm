<?php

namespace SW_WAPF\Includes\Models {

    if (!defined('ABSPATH')) {
        die;
    }

    class Conditional
    {
        /** @var ConditionalRule[] */
        public $rules;

        public function __construct()
        {
            $this->rules = [];
        }
    }
}