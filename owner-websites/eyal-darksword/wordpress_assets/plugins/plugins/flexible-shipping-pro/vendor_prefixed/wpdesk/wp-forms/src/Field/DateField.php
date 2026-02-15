<?php

namespace FSProVendor\WPDesk\Forms\Field;

use FSProVendor\WPDesk\Forms\Sanitizer\TextFieldSanitizer;
class DateField extends \FSProVendor\WPDesk\Forms\Field\BasicField
{
    public function __construct()
    {
        parent::__construct();
        $this->set_placeholder('YYYY-MM-DD');
    }
    public function get_type()
    {
        return 'date';
    }
    public function get_template_name()
    {
        return 'input-text';
    }
}
