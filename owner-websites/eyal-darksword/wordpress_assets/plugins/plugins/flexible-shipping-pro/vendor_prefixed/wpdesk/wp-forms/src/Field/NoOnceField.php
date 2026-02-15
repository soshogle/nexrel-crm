<?php

namespace FSProVendor\WPDesk\Forms\Field;

use FSProVendor\WPDesk\Forms\Validator\NonceValidator;
class NoOnceField extends \FSProVendor\WPDesk\Forms\Field\BasicField
{
    public function __construct($action_name)
    {
        parent::__construct();
        $this->meta['action'] = $action_name;
    }
    public function get_validator()
    {
        return new \FSProVendor\WPDesk\Forms\Validator\NonceValidator($this->get_meta_value('action'));
    }
    public function get_template_name()
    {
        return 'noonce';
    }
}
