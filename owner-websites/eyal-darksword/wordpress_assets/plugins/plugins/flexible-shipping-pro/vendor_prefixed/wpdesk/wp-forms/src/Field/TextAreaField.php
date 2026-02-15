<?php

namespace FSProVendor\WPDesk\Forms\Field;

class TextAreaField extends \FSProVendor\WPDesk\Forms\Field\BasicField
{
    public function __construct()
    {
        parent::__construct();
        $this->set_default_value('');
    }
    public function get_template_name()
    {
        return 'textarea';
    }
}
