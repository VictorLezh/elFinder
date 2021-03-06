"use strict";
/**
 * @class  elFinder toolbar
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindertoolbar = function(fm, opts) {
	this.not('.elfinder-toolbar').each(function() {
		var commands = fm._commands,
			self     = $(this).addClass('ui-helper-clearfix ui-widget-header ui-corner-top elfinder-toolbar'),
			options  = {
				// default options
				displayTextLabel: false,
				labelExcludeUA: ['Mobile'],
				autoHideUA: ['Mobile']
			},
			filter   = function(opts) {
				return $.map(opts, function(v) {
					if ($.isPlainObject(v)) {
						options = $.extend(options, v);
						return null;
					}
					return [v];
				});
			},
			render = function(disabled){
				var name;
				
				$.each(buttons, function(i, b) { b.detach(); });
				self.empty();
				l = panels.length;
				while (l--) {
					if (panels[l]) {
						panel = $('<div class="ui-widget-content ui-corner-all elfinder-buttonset"/>');
						i = panels[l].length;
						while (i--) {
							name = panels[l][i];
							if ((!disabled || $.inArray(name, disabled) === -1) && (cmd = commands[name])) {
								button = 'elfinder'+cmd.options.ui;
								if (! buttons[name] && $.fn[button]) {
									buttons[name] = $('<div/>')[button](cmd);
								}
								if (buttons[name]) {
									textLabel && buttons[name].find('.elfinder-button-text').show();
									panel.prepend(buttons[name]);
								}
							}
						}
						
						panel.children().length && self.prepend(panel);
						panel.children(':gt(0)').before('<span class="ui-widget-content elfinder-toolbar-button-separator"/>');

					}
				}
				
				(! self.data('swipeClose') && self.children().length)? self.show() : self.hide();
				fm.trigger('toolbarload').trigger('uiresize');
			},
			buttons = {},
			panels   = filter(opts || []),
			dispre   = null,
			uiCmdMapPrev = '',
			l, i, cmd, panel, button, swipeHandle, autoHide, textLabel;
		
		// correction of options.displayTextLabel
		textLabel = fm.storage('toolbarTextLabel');
		if (textLabel === null) {
			textLabel = (options.displayTextLabel && (! options.labelExcludeUA || ! options.labelExcludeUA.length || ! $.map(options.labelExcludeUA, function(v){ return fm.UA[v]? true : null; }).length));
		} else {
			textLabel = (textLabel == 1);
		}
		
		// add contextmenu
		self.on('contextmenu', function(e) {
				e.stopPropagation();
				e.preventDefault();
				fm.trigger('contextmenu', {
					raw: [{
						label    : fm.i18n('textLabel'),
						icon     : 'accept',
						callback : function() {
							textLabel = ! textLabel;
							self.height('').find('.elfinder-button-text')[textLabel? 'show':'hide']();
							fm.trigger('uiresize').storage('toolbarTextLabel', textLabel? '1' : '0');
						}
					}],
					x: e.pageX,
					y: e.pageY
				});
			}).on('touchstart', function(e) {
				if (e.originalEvent.touches.length > 1) {
					return;
				}
				self.data('tmlongtap') && clearTimeout(self.data('tmlongtap'));
				self.removeData('longtap')
					.data('longtap', {x: e.originalEvent.touches[0].pageX, y: e.originalEvent.touches[0].pageY})
					.data('tmlongtap', setTimeout(function() {
						self.removeData('longtapTm')
							.trigger({
								type: 'contextmenu',
								pageX: self.data('longtap').x,
								pageY: self.data('longtap').y
							})
							.data('longtap', {longtap: true});
					}, 500));
			}).on('touchmove touchend', function(e) {
				if (self.data('tmlongtap')) {
					if (e.type === 'touchend' ||
							( Math.abs(self.data('longtap').x - e.originalEvent.touches[0].pageX)
							+ Math.abs(self.data('longtap').y - e.originalEvent.touches[0].pageY)) > 4)
					clearTimeout(self.data('tmlongtap'));
					self.removeData('longtapTm');
				}
			}).on('click', function(e) {
				if (self.data('longtap') && self.data('longtap').longtap) {
					e.stopImmediatePropagation();
					e.preventDefault();
				}
			}).on('touchend click', '.elfinder-button', function(e) {
				if (self.data('longtap') && self.data('longtap').longtap) {
					e.stopImmediatePropagation();
					e.preventDefault();
				}
			});

		self.prev().length && self.parent().prepend(this);
		
		render();
		
		fm.bind('open sync select', function(e) {
			var disabled = fm.option('disabled'),
				doRender, sel;
			
			if (e.type === 'select') {
				sel = fm.selected();
				if (sel.length) {
					disabled = fm.getDisabledCmds(sel);
				}
			}
			
			if (!dispre || dispre.toString() !== disabled.sort().toString()) {
				render(disabled && disabled.length? disabled : null);
				doRender = true;
			}
			dispre = disabled.concat().sort();

			if (doRender || uiCmdMapPrev !== JSON.stringify(fm.commandMap)) {
				uiCmdMapPrev = JSON.stringify(fm.commandMap);
				if (! doRender) {
					// reset toolbar
					$.each($('div.elfinder-button'), function(){
						var origin = $(this).data('origin');
						if (origin) {
							$(this).after(origin).detach();
						}
					});
				}
				if (Object.keys(fm.commandMap).length) {
					$.each(fm.commandMap, function(from, to){
						var cmd = fm._commands[to],
							button = cmd? 'elfinder'+cmd.options.ui : null,
							btn;
						if (button && $.fn[button]) {
							btn = buttons[from];
							if (btn) {
								if (! buttons[to] && $.fn[button]) {
									buttons[to] = $('<div/>')[button](fm._commands[to]);
									if (buttons[to]) {
										textLabel && buttons[to].find('.elfinder-button-text').show();
										if (cmd.extendsCmd) {
											buttons[to].children('span.elfinder-button-icon').addClass('elfinder-button-icon-' + cmd.extendsCmd)
										};
									}
								}
								if (buttons[to]) {
									btn.after(buttons[to]);
									buttons[to].data('origin', btn.detach());
								}
							}
						}
					});
				}
			}
		});
		
		if (fm.UA.Touch) {
			autoHide = fm.storage('autoHide') || {};
			if (typeof autoHide.toolbar === 'undefined') {
				autoHide.toolbar = (options.autoHideUA && options.autoHideUA.length > 0 && $.map(options.autoHideUA, function(v){ return fm.UA[v]? true : null; }).length);
				fm.storage('autoHide', autoHide);
			}
			
			if (autoHide.toolbar) {
				fm.one('init', function() {
					fm.uiAutoHide.push(function(){ self.stop(true, true).trigger('toggle', { duration: 500, init: true }); });
				});
			}
			
			fm.bind('load', function() {
				swipeHandle = $('<div class="elfinder-toolbar-swipe-handle"/>').hide().appendTo(fm.getUI());
				if (swipeHandle.css('pointer-events') !== 'none') {
					swipeHandle.remove();
					swipeHandle = null;
				}
			});
			
			self.on('toggle', function(e, data) {
				var wz    = fm.getUI('workzone'),
					toshow= self.is(':hidden'),
					wzh   = wz.height(),
					h     = self.height(),
					tbh   = self.outerHeight(true),
					delta = tbh - h,
					opt   = $.extend({
						step: function(now) {
							wz.height(wzh + (toshow? (now + delta) * -1 : h - now));
							fm.trigger('resize');
						},
						always: function() {
							self.css('height', '');
							fm.trigger('uiresize');
							if (swipeHandle) {
								if (toshow) {
									swipeHandle.stop(true, true).hide();
								} else {
									swipeHandle.height(data.handleH? data.handleH : '');
									fm.resources.blink(swipeHandle, 'slowonce');
								}
							}
							data.init && fm.trigger('uiautohide');
						}
					}, data);
				self.data('swipeClose', ! toshow).stop(true, true).animate({height : 'toggle'}, opt);
				autoHide.toolbar = !toshow;
				fm.storage('autoHide', $.extend(fm.storage('autoHide'), {toolbar: autoHide.toolbar}));
			});
		}
	});
	
	return this;
};
