<?php

namespace SW_WAPF\Includes\Models {

    if (!defined('ABSPATH')) {
        die;
    }

        class ConditionRuleGroup
        {
            /**
             * @var ConditionRule[]
             */
            public $rules;

            public function __construct()
            {
                $this->rules = [];
            }
        }
}