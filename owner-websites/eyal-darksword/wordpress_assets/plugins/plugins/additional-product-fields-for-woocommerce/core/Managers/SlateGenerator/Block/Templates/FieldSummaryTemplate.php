<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Block\Templates;


use rednaowooextraproduct\core\Managers\SlateGenerator\Core\HtmlTagWrapper;

class FieldSummaryTemplate extends TemplateBase
{

    /**
     * @inheritDoc
     */
    public function GetHtml()
    {
        return $this->SlateGenerator->FormBuilder->GetHtml($this->SlateGenerator->Document);
    }
}