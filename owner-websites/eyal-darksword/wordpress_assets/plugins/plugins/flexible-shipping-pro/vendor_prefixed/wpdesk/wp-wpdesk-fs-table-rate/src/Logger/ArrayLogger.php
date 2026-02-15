<?php

/**
 * Array logger.
 *
 * @package WPDesk\FS\TableRate\Logger
 */
namespace FSProVendor\WPDesk\FS\TableRate\Logger;

use Psr\Log\LoggerInterface;
use Psr\Log\LoggerTrait;
use FSProVendor\WPDesk\View\Renderer\SimplePhpRenderer;
use FSProVendor\WPDesk\View\Resolver\ChainResolver;
use FSProVendor\WPDesk\View\Resolver\DirResolver;
/**
 * Can log to array.
 */
class ArrayLogger implements \Psr\Log\LoggerInterface
{
    use LoggerTrait;
    /**
     * @var array
     */
    private $messages = array();
    /**
     * @param mixed $level .
     * @param string $message .
     * @param array $context .
     */
    public function log($level, $message, array $context = array())
    {
        $this->messages[] = array('level' => $level, 'message' => $message, 'context' => $context);
    }
    /**
     * @return array
     */
    public function get_messages()
    {
        return $this->messages;
    }
}
