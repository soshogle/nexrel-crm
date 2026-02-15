<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Block;


use DOMDocument;
use rednaowooextraproduct\core\Managers\SlateGenerator\Block\Templates\FieldSummaryTemplate;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\NodeElementBase;

class Template extends NodeElementBase
{

    /**
     * @inheritDoc
     */
    public function GetNodeName()
    {
        return 'div';
    }

    public function Process()
    {
       $templateName=$this->GetDataValue('TemplateName','');
       $template=null;
        if($templateName=='FieldSummary')
        {
            $template=new FieldSummaryTemplate();

        }

        if($template==null)
        {
            $this->Node->Remove();
            return;
        }




        $template->Initialize($this->Generator);
        $this->Node->AppendChild($template->GetHtml());

    }
}