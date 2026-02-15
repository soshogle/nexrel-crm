<?php

namespace FSProVendor\WPDesk\Forms\Field;

class MultipleInputTextField extends \FSProVendor\WPDesk\Forms\Field\InputTextField
{
    /**
     * @return string
     */
    public function get_template_name()
    {
        return 'input-text-multiple';
    }
}
