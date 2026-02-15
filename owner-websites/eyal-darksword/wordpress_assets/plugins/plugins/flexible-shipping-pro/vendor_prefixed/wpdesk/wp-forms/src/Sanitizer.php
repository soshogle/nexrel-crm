<?php

namespace FSProVendor\WPDesk\Forms;

interface Sanitizer
{
    /**
     * @param mixed $value
     *
     * @return string
     */
    public function sanitize($value);
}
