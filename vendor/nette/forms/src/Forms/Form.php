<?php

/**
 * This file is part of the Nette Framework (https://nette.org)
 * Copyright (c) 2004 David Grudl (https://davidgrudl.com)
 */

declare(strict_types=1);

namespace Nette\Forms;

use Nette;
use Nette\Utils\Html;


/**
 * Creates, validates and renders HTML forms.
 *
 * @property-read array $errors
 * @property-read array $ownErrors
 * @property-read Html $elementPrototype
 * @property-read IFormRenderer $renderer
 * @property string $action
 * @property string $method
 */
class Form extends Container implements Nette\Utils\IHtmlString
{
	/** validator */
	public const
		EQUAL = ':equal',
		IS_IN = self::EQUAL,
		NOT_EQUAL = ':notEqual',
		IS_NOT_IN = self::NOT_EQUAL,
		FILLED = ':filled',
		BLANK = ':blank',
		REQUIRED = self::FILLED,
		VALID = ':valid',

		// button
		SUBMITTED = ':submitted',

		// text
		MIN_LENGTH = ':minLength',
		MAX_LENGTH = ':maxLength',
		LENGTH = ':length',
		EMAIL = ':email',
		URL = ':url',
		PATTERN = ':pattern',
		PATTERN_ICASE = ':patternCaseInsensitive',
		INTEGER = ':integer',
		NUMERIC = ':numeric',
		FLOAT = ':float',
		MIN = ':min',
		MAX = ':max',
		RANGE = ':range',

		// multiselect
		COUNT = self::LENGTH,

		// file upload
		MAX_FILE_SIZE = ':fileSize',
		MIME_TYPE = ':mimeType',
		IMAGE = ':image',
		MAX_POST_SIZE = ':maxPostSize';

	/** method */
	public const
		GET = 'get',
		POST = 'post';

	/** submitted data types */
	public const
		DATA_TEXT = 1,
		DATA_LINE = 2,
		DATA_FILE = 3,
		DATA_KEYS = 8;

	/** @internal tracker ID */
	public const TRACKER_ID = '_form_';

	/** @internal protection token ID */
	public const PROTECTOR_ID = '_token_';

	/** @var callable[]  function (Form $sender): void; Occurs when the form is submitted and successfully validated */
	public $onSuccess;

	/** @var callable[]  function (Form $sender): void; Occurs when the form is submitted and is not valid */
	public $onError;

	/** @var callable[]  function (Form $sender): void; Occurs when the form is submitted */
	public $onSubmit;

	/** @var callable[]  function (Form $sender): void; Occurs before the form is rendered */
	public $onRender;

	/** @var Nette\Http\IRequest  used only by standalone form */
	public $httpRequest;

	/** @var mixed or null meaning: not detected yet */
	private $submittedBy;

	/** @var array */
	private $httpData;

	/** @var Html  <form> element */
	private $element;

	/** @var IFormRenderer */
	private $renderer;

	/** @var Nette\Localization\ITranslator */
	private $translator;

	/** @var ControlGroup[] */
	private $groups = [];

	/** @var array */
	private $errors = [];

	/** @var bool */
	private $beforeRenderCalled;


	/**
	 * Form constructor.
	 */
	public function __construct(string $name = null)
	{
		if ($name !== null) {
			$this->getElementPrototype()->id = 'frm-' . $name;
			$tracker = new Controls\HiddenField($name);
			$tracker->setOmitted();
			$this[self::TRACKER_ID] = $tracker;
			$this->setParent(null, $name);
		}
		$this->monitor(__CLASS__, function (): void {
			throw new Nette\InvalidStateException('Nested forms are forbidden.');
		});
	}


	/**
	 * Returns self.
	 * @return static
	 */
	public function getForm(bool $throw = true): self
	{
		return $this;
	}


	/**
	 * Sets form's action.
	 * @param  string|object  $url
	 * @return static
	 */
	public function setAction($url)
	{
		$this->getElementPrototype()->action = $url;
		return $this;
	}


	/**
	 * Returns form's action.
	 * @return mixed
	 */
	public function getAction()
	{
		return $this->getElementPrototype()->action;
	}


	/**
	 * Sets form's method GET or POST.
	 * @return static
	 */
	public function setMethod(string $method)
	{
		if ($this->httpData !== null) {
			throw new Nette\InvalidStateException(__METHOD__ . '() must be called until the form is empty.');
		}
		$this->getElementPrototype()->method = strtolower($method);
		return $this;
	}


	/**
	 * Returns form's method.
	 */
	public function getMethod(): string
	{
		return $this->getElementPrototype()->method;
	}


	/**
	 * Checks if the request method is the given one.
	 */
	public function isMethod(string $method): bool
	{
		return strcasecmp($this->getElementPrototype()->method, $method) === 0;
	}


	/**
	 * Cross-Site Request Forgery (CSRF) form protection.
	 */
	public function addProtection(string $errorMessage = null): Controls\CsrfProtection
	{
		$control = new Controls\CsrfProtection($errorMessage);
		$this->addComponent($control, self::PROTECTOR_ID, key($this->getComponents()));
		return $control;
	}


	/**
	 * Adds fieldset group to the form.
	 */
	public function addGroup(string $caption = null, bool $setAsCurrent = true): ControlGroup
	{
		$group = new ControlGroup;
		$group->setOption('label', $caption);
		$group->setOption('visual', true);

		if ($setAsCurrent) {
			$this->setCurrentGroup($group);
		}

		if (!is_scalar($caption) || isset($this->groups[$caption])) {
			return $this->groups[] = $group;
		} else {
			return $this->groups[$caption] = $group;
		}
	}


	/**
	 * Removes fieldset group from form.
	 * @param  string|int|ControlGroup  $name
	 */
	public function removeGroup($name): void
	{
		if (is_string($name) && isset($this->groups[$name])) {
			$group = $this->groups[$name];

		} elseif ($name instanceof ControlGroup && in_array($name, $this->groups, true)) {
			$group = $name;
			$name = array_search($group, $this->groups, true);

		} else {
			throw new Nette\InvalidArgumentException("Group not found in form '$this->name'");
		}

		foreach ($group->getControls() as $control) {
			$control->getParent()->removeComponent($control);
		}

		unset($this->groups[$name]);
	}


	/**
	 * Returns all defined groups.
	 * @return ControlGroup[]
	 */
	public function getGroups(): array
	{
		return $this->groups;
	}


	/**
	 * Returns the specified group.
	 * @param  string|int  $name
	 */
	public function getGroup($name): ?ControlGroup
	{
		return $this->groups[$name] ?? null;
	}


	/********************* translator ****************d*g**/


	/**
	 * Sets translate adapter.
	 * @return static
	 */
	public function setTranslator(?Nette\Localization\ITranslator $translator)
	{
		$this->translator = $translator;
		return $this;
	}


	/**
	 * Returns translate adapter.
	 */
	public function getTranslator(): ?Nette\Localization\ITranslator
	{
		return $this->translator;
	}


	/********************* submission ****************d*g**/


	/**
	 * Tells if the form is anchored.
	 */
	public function isAnchored(): bool
	{
		return true;
	}


	/**
	 * Tells if the form was submitted.
	 * @return ISubmitterControl|bool  submittor control
	 */
	public function isSubmitted()
	{
		if ($this->submittedBy === null) {
			$this->getHttpData();
		}
		return $this->submittedBy;
	}


	/**
	 * Tells if the form was submitted and successfully validated.
	 */
	public function isSuccess(): bool
	{
		return $this->isSubmitted() && $this->isValid();
	}


	/**
	 * Sets the submittor control.
	 * @return static
	 * @internal
	 */
	public function setSubmittedBy(?ISubmitterControl $by)
	{
		$this->submittedBy = $by === null ? false : $by;
		return $this;
	}


	/**
	 * Returns submitted HTTP data.
	 * @return mixed
	 */
	public function getHttpData(int $type = null, string $htmlName = null)
	{
		if ($this->httpData === null) {
			if (!$this->isAnchored()) {
				throw new Nette\InvalidStateException('Form is not anchored and therefore can not determine whether it was submitted.');
			}
			$data = $this->receiveHttpData();
			$this->httpData = (array) $data;
			$this->submittedBy = is_array($data);
		}
		if ($htmlName === null) {
			return $this->httpData;
		}
		return Helpers::extractHttpData($this->httpData, $htmlName, $type);
	}


	/**
	 * Fires submit/click events.
	 */
	public function fireEvents(): void
	{
		if (!$this->isSubmitted()) {
			return;

		} elseif (!$this->getErrors()) {
			$this->validate();
		}

		if ($this->submittedBy instanceof ISubmitterControl) {
			if ($this->isValid()) {
				if ($handlers = $this->submittedBy->onClick) {
					if (!is_iterable($handlers)) {
						throw new Nette\UnexpectedValueException("Property \$onClick in button '{$this->submittedBy->getName()}' must be iterable, " . gettype($handlers) . ' given.');
					}
					$this->invokeHandlers($handlers, $this->submittedBy);
				}
			} else {
				$this->submittedBy->onInvalidClick($this->submittedBy);
			}
		}

		if (!$this->isValid()) {
			$this->onError($this);

		} elseif ($this->onSuccess !== null) {
			if (!is_iterable($this->onSuccess)) {
				throw new Nette\UnexpectedValueException('Property Form::$onSuccess must be iterable, ' . gettype($this->onSuccess) . ' given.');
			}
			$this->invokeHandlers($this->onSuccess);
			if (!$this->isValid()) {
				$this->onError($this);
			}
		}

		$this->onSubmit($this);
	}


	private function invokeHandlers(iterable $handlers, $button = null): void
	{
		foreach ($handlers as $handler) {
			$params = Nette\Utils\Callback::toReflection($handler)->getParameters();
			$values = isset($params[1]) ? $this->getValues((string) $params[1]->getType()) : null;
			$handler($button ?: $this, $values);
			if (!$this->isValid()) {
				return;
			}
		}
	}


	/**
	 * Resets form.
	 * @return static
	 */
	public function reset()
	{
		$this->setSubmittedBy(null);
		$this->setValues([], true);
		return $this;
	}


	/**
	 * Internal: returns submitted HTTP data or null when form was not submitted.
	 */
	protected function receiveHttpData(): ?array
	{
		$httpRequest = $this->getHttpRequest();
		if (strcasecmp($this->getMethod(), $httpRequest->getMethod())) {
			return null;
		}

		if ($httpRequest->isMethod('post')) {
			$data = Nette\Utils\Arrays::mergeTree($httpRequest->getPost(), $httpRequest->getFiles());
		} else {
			$data = $httpRequest->getQuery();
			if (!$data) {
				return null;
			}
		}

		if ($tracker = $this->getComponent(self::TRACKER_ID, false)) {
			if (!isset($data[self::TRACKER_ID]) || $data[self::TRACKER_ID] !== $tracker->getValue()) {
				return null;
			}
		}

		return $data;
	}


	/********************* validation ****************d*g**/


	public function validate(array $controls = null): void
	{
		$this->cleanErrors();
		if ($controls === null && $this->submittedBy instanceof ISubmitterControl) {
			$controls = $this->submittedBy->getValidationScope();
		}
		$this->validateMaxPostSize();
		parent::validate($controls);
	}


	/** @internal */
	public function validateMaxPostSize(): void
	{
		if (!$this->submittedBy || !$this->isMethod('post') || empty($_SERVER['CONTENT_LENGTH'])) {
			return;
		}
		$maxSize = ini_get('post_max_size');
		$units = ['k' => 10, 'm' => 20, 'g' => 30];
		if (isset($units[$ch = strtolower(substr($maxSize, -1))])) {
			$maxSize = (int) $maxSize << $units[$ch];
		}
		if ($maxSize > 0 && $maxSize < $_SERVER['CONTENT_LENGTH']) {
			$this->addError(sprintf(Validator::$messages[self::MAX_FILE_SIZE], $maxSize));
		}
	}


	/**
	 * Adds global error message.
	 * @param  string|object  $message
	 */
	public function addError($message, bool $translate = true): void
	{
		if ($translate && $this->translator) {
			$message = $this->translator->translate($message);
		}
		$this->errors[] = $message;
	}


	/**
	 * Returns global validation errors.
	 */
	public function getErrors(): array
	{
		return array_unique(array_merge($this->errors, parent::getErrors()));
	}


	public function hasErrors(): bool
	{
		return (bool) $this->getErrors();
	}


	public function cleanErrors(): void
	{
		$this->errors = [];
	}


	/**
	 * Returns form's validation errors.
	 */
	public function getOwnErrors(): array
	{
		return array_unique($this->errors);
	}


	/********************* rendering ****************d*g**/


	/**
	 * Returns form's HTML element template.
	 */
	public function getElementPrototype(): Html
	{
		if (!$this->element) {
			$this->element = Html::el('form');
			$this->element->action = ''; // RFC 1808 -> empty uri means 'this'
			$this->element->method = self::POST;
		}
		return $this->element;
	}


	/**
	 * Sets form renderer.
	 * @return static
	 */
	public function setRenderer(?IFormRenderer $renderer)
	{
		$this->renderer = $renderer;
		return $this;
	}


	/**
	 * Returns form renderer.
	 */
	public function getRenderer(): IFormRenderer
	{
		if ($this->renderer === null) {
			$this->renderer = new Rendering\DefaultFormRenderer;
		}
		return $this->renderer;
	}


	protected function beforeRender()
	{
	}


	/**
	 * Must be called before form is rendered and render() is not used.
	 */
	public function fireRenderEvents(): void
	{
		if (!$this->beforeRenderCalled) {
			$this->beforeRenderCalled = true;
			$this->beforeRender();
			$this->onRender($this);
		}
	}


	/**
	 * Renders form.
	 */
	public function render(...$args): void
	{
		$this->fireRenderEvents();
		echo $this->getRenderer()->render($this, ...$args);
	}


	/**
	 * Renders form to string.
	 * @param can throw exceptions? (hidden parameter)
	 */
	public function __toString(): string
	{
		try {
			$this->fireRenderEvents();
			return $this->getRenderer()->render($this);

		} catch (\Throwable $e) {
			if (func_num_args()) {
				throw $e;
			}
			trigger_error('Exception in ' . __METHOD__ . "(): {$e->getMessage()} in {$e->getFile()}:{$e->getLine()}", E_USER_ERROR);
		}
	}


	/********************* backend ****************d*g**/


	private function getHttpRequest(): Nette\Http\IRequest
	{
		if (!$this->httpRequest) {
			$factory = new Nette\Http\RequestFactory;
			$this->httpRequest = $factory->createHttpRequest();
		}
		return $this->httpRequest;
	}


	public function getToggles(): array
	{
		$toggles = [];
		foreach ($this->getComponents(true, Controls\BaseControl::class) as $control) {
			$toggles = $control->getRules()->getToggleStates($toggles);
		}
		return $toggles;
	}
}
