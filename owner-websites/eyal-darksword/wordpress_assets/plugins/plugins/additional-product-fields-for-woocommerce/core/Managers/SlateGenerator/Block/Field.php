<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Block;


use rednaowooextraproduct\core\Managers\FormManager\Fields\FBFieldBase;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\NodeElementBase;
use rednaowooextraproduct\core\Managers\SlateGenerator\Text\Text;

class Field extends NodeElementBase
{

    /** @var FBFieldBase */
    public $Field;
    /**
     * @inheritDoc
     */
    public function GetNodeName()
    {
        return 'div';
    }

    public function Process()
    {
        $this->Node->AddStyles(array('display'=>'inline'));
        parent::Process();

        if(count($this->Children)==0)
        {
            $this->Node->Remove();
            return;
        }

        $child=$this->Children[0];

        if(!$child instanceof Text)
        {
            $this->Node->Remove();;
            return;
        }
        $fieldId=$this->GetDataValue('FieldId','');
        $this->Field=$this->Generator->FormBuilder->ContainerManager->GetFieldById($fieldId,true);

        if($this->Field==null)
        {
            $this->Node->Remove();
            return;
        }

        $Value=$child->CloneDomSpan();

        $this->Node->Clear();




        if($this->GetDataValue('IncludeLabel',false))
        {
            $labelNode=$Value->CloneNode();
            $label=$this->Field->Options->Label;
            if(\trim($label)!='')
            {
                $label.=': ';
                $labelNode->SetText($label);
                $this->Node->AppendChild($labelNode);
            }

        }

        if($this->Generator->IsTest)
        {
            $Value->SetText('[Test Value]');
        }
        else{
            $element=$this->CreateElement('div');
            $element->AddStyle('display','inline-block');
            $element->AppendChild($this->Field->GetHtml($this->Node->Document));
            $Value->AppendChild($element);

        }

        $this->Node->AppendChild($Value);



    }
}