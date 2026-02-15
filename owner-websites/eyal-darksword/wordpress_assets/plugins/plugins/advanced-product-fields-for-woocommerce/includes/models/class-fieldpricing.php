<?php

namespace SW_WAPF\Includes\Models {

    if (!defined('ABSPATH')) {
        die;
    }

    class FieldPricing
    {
        /** @var bool */
        public $enabled;

        /** @var float */
        public $amount;

        /** @var string */
        public $type;

        public function __construct()
        {
            $this->enabled = false;
            $this->type = 'fixed';
            $this->amount = 0;
        }
    }
}