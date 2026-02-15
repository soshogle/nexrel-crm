<?php


namespace rednaowooextraproduct\core\Managers\SlateGenerator\Core;


use DOMDocument;
use rednaowooextraproduct\core\Managers\FormManager\FormBuilder;
use rednaowooextraproduct\core\Managers\SlateGenerator\Block\SlateBody;
use rednaowooextraproduct\core\Managers\SlateGenerator\Core\Styles\StyleSetter;


class SlateGenerator
{
    /** @var FormBuilder */
    public $FormBuilder;
    public $SlateObject;
    /** @var  SlateBody */
    public $BodyNode;
    /** @var DOMDocument  */
    public $Document;
    public $IsTest;
    public function __construct($formBuilder,$slateObjects)
    {
        $this->IsTest=false;
        $this->FormBuilder=$formBuilder;
        $this->SlateObject=$slateObjects;
        $this->Document=new DOMDocument();
        $htmlTag=$this->Document->createElement('html');
        $head=$this->Document->createElement('head');
        $htmlTag->appendChild($head);
        $this->Document->appendChild($htmlTag);


        $meta = array(
            array('charset' => 'utf-8')
        );

        foreach ($meta as $attributes) {
            $node = $head->appendChild($this->Document->createElement('meta'));
            foreach ($attributes as $key => $value) {
                $node->setAttribute($key, $value);
            }
        }

        $body=new HtmlTagWrapper($this->Document, $this->Document->createElement('body'));
        $htmlTag->appendChild($body->GetDomElement());

        $center=$body->CreateAndAppendChild('center');

        $rootTable=$center->CreateAndAppendChild('table');
        $rootTable->AddStyle('width','800px');
        $rootTbody=$rootTable->CreateAndAppendChild('tbody');
        $rootRow=$rootTbody->CreateAndAppendChild('tr');
        $rootColumn=$rootRow->CreateAndAppendChild('td');
        $rootColumn->AddStyle('width','800px');
        $rootColumn->AddStyle('border','1px solid #ccc');
        $rootColumn->AddStyle('background-color','white');
        $rootColumn->SetAttribute('align','center');


        $this->BodyNode=new SlateBody();
        $this->BodyNode->Initialize(null,$this,$slateObjects->document);
        $rootColumn->AppendChild($this->BodyNode->Node);



    }

    public function SetIsTest()
    {
        $this->IsTest=true;
    }

    public function GetHtml(){
        $this->BodyNode->Process();
        $this->ApplyStyles();
        return '<!doctype html>'. trim($this->Document->saveHTML());
    }

    public function CreateElement($elementName){
        return  new HtmlTagWrapper($this->Document, $this->Document->createElement($elementName));
    }

    private function GetStyles()
    {
        return array(
            'body'=>array(
                'background-color'=>'#e9eaec',
                'font-family'=>"'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif"
            ),
            "#RNEmailContainer"=>array(
                'max-width'=>'800px !important',
                'margin'=>'10px',
                'background-color'=>'white',
                'padding'=>'30px'
            ),
            'td'=>array(
                'padding'=>0
            ),
            'table'=>array(
                'width'=>'100%',
                'border-collapse'=>'collapse'
            ),
            '.rnFieldValue'=>array(
                'margin-bottom'=>'15px'
            ),
            '.rnFieldLabel'=>array(
                'font-weight'=>'bold',
                'margin-bottom'=>'5px'
            )

        );
    }

    private function ApplyStyles()
    {
        $styles=new StyleSetter();
        $styles->Apply($this->GetStyles(),$this->Document);
    }


}