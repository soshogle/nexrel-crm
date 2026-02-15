<?php


namespace rednaowooextraproduct\core\Managers\FormManager\ContainerManager;



use DOMDocument;
use rednaowooextraproduct\core\Managers\FormManager\Fields\FBFieldBase;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\HtmlTagWrapper;

class ContainerManager
{

    /** @var ContainerDataRetriever */
    public $Container;

    public function __construct($Container)
    {
        $this->Container=$Container;
    }

    /**
     * @param bool $includeFieldsOfRepeaters
     * @param bool $IncludeFieldsOfParentContainers
     * @param bool $includeFieldsOfGroupPanel
     * @return FBFieldBase[]
     */
    public function GetFields($includeFieldsOfRepeaters=false,$IncludeFieldsOfParentContainers=false,
                              $includeFieldsOfGroupPanel=true) {
        /** @var FBFieldBase[] $fields */
        $fields=[];
        if($this->Container->Rows==null)
            return $fields;
        foreach($this->Container->Rows as $row)
        {
            foreach($row->Columns as $column)
            {
                $field=$column->Field;
                $fields[]=$field;

                if(($field->Options->Type=='collapsible'|| $field->Options->Type=='grouppanel'||$field->Options->Type=='popup')&&$includeFieldsOfGroupPanel)
                {
                    foreach($field->ContainerManager->GetFields(true) as $subField)
                    {
                        $fields[]=$subField;
                    }
                }

                if($includeFieldsOfRepeaters&&($field->Options->Type=='repeater'||$field->Options->Type=='repeater_item'))
                {
                    foreach($field->ContainerManager->GetFields(true) as $subField)
                        $fields[]=$subField;
                }
            }
        }

        if($IncludeFieldsOfParentContainers)
        {
            if($this->Container->GetForm()!=null)
                $fields=\array_merge($fields,array_values(\array_filter($this->Container->GetForm()->ContainerManager->GetFields(false,true),
                    function ($element) use($fields){
                        $found=false;
                       foreach($fields as $currentField)
                       {
                           if(isset($currentField->Options->Id)&&isset($element->Options->Id)&& $currentField->Options->Id==$element->Options->Id)
                               $found=true;
                       }
                        return $found;
                    })));
        }

        return $fields;


    }

    public function GetFieldById($id,$searchInChildContainer=false,$searchInParentContainers=false){
        foreach($this->GetFields() as $field)
        {
            if($field->Options->Id== $id)
                return $field;

            if($searchInChildContainer&&isset($field->ContainerManager))
            {
                $field=$field->ContainerManager->GetFieldById($id,true);
                if($field!=null)
                    return $field;
            }

            if($searchInParentContainers&&$this->Container->GetForm()!=null)
            {
                return $this->Container->GetForm()->ContainerManager->GetFieldById($id,false,true);
            }
        }

        return null;
    }

    /**
     * @param $document DOMDocument
     */
    public function GetHtml($document)
    {
        $container=new HtmlTagWrapper($document,$document->createElement('table'));
        $body=$container->CreateAndAppendChild('tbody');
        foreach($this->Container->GetRows() as $row)
        {
            $domRow=$body->CreateElement('tr');
            $domColumn=$domRow->CreateAndAppendChild('td');
            $domColumn->AddClass('rnColumn');

            $columnTable=$domColumn->CreateAndAppendChild('table');
            $columnBody=$columnTable->CreateAndAppendChild('tbody');
            $columnRow=$columnBody->CreateAndAppendChild('tr');
            foreach ($row->Columns as $column)
            {
                $currentField = $column->Field;
                if (!$currentField->IsUsed())
                    continue;

                $subFieldContainer=$columnRow->CreateAndAppendChild('td');
                if(isset($column->Options->WidthPercentage))
                {
                    $subFieldContainer->AddStyle('width',$column->Options->WidthPercentage.'%');
                }



                if (trim($currentField->Options->Label) != '')
                {
                    $header = $subFieldContainer->CreateAndAppendChild('div');
                    $header->AddClass('rnFieldLabel');
                    $header->SetText($currentField->Options->Label);
                }

                $value = $subFieldContainer->CreateAndAppendChild('div');
                $value->AddClass('rnFieldValue');
                $value->AppendChild($currentField->GetHtml($subFieldContainer->Document));
            }
            if(\count($domColumn->Children)>0)
                $body->AppendChild($domRow);
        }
        return $container;
    }


}