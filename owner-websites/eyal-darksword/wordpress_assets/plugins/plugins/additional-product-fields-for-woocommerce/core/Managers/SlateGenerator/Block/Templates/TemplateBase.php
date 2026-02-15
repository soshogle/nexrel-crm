<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Block\Templates;


use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\HtmlTagWrapper;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\SlateGenerator;

abstract class TemplateBase
{

    /** @var SlateGenerator */
    public $SlateGenerator;

    public function Initialize($slateGenerator){
        $this->SlateGenerator=$slateGenerator;
    }


    /**
     * @return HtmlTagWrapper
     */
    public abstract function GetHtml();
}