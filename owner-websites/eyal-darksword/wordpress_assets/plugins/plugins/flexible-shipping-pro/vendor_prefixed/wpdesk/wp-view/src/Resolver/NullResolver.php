<?php

namespace FSProVendor\WPDesk\View\Resolver;

use FSProVendor\WPDesk\View\Renderer\Renderer;
use FSProVendor\WPDesk\View\Resolver\Exception\CanNotResolve;
/**
 * This resolver never finds the file
 *
 * @package WPDesk\View\Resolver
 */
class NullResolver implements \FSProVendor\WPDesk\View\Resolver\Resolver
{
    public function resolve($name, \FSProVendor\WPDesk\View\Renderer\Renderer $renderer = null)
    {
        throw new \FSProVendor\WPDesk\View\Resolver\Exception\CanNotResolve("Null Cannot resolve");
    }
}
